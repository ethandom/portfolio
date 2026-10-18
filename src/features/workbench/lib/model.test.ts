import { Box3, Mesh, Raycaster, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";
import { hasSceneGlb, loadSceneGlb } from "@/testing/scene-glb";
import { ACTIONS, type ActionContext } from "./actions";
import { HIT_IDS, hitIdOf, STATION_IDS, zoneOf } from "./hits";
import { prepareModel, type WorkbenchModel } from "./model";
import { bindBoard } from "./relay-board";
import { BOOT_LOG, type MonitorScreen } from "./screens";
import { Terminal } from "./terminal";
import { Tweens } from "./tweens";

/** The real export: these tests are the glTF contract. */
const load = async (): Promise<WorkbenchModel> =>
  prepareModel(await loadSceneGlb());

/** An action context as the scene builds it, LEDs bound to the terminal as the scene binds them. */
function harness(model: WorkbenchModel) {
  const tweens = new Tweens();
  const monitor = { boot: vi.fn(), idle: vi.fn() };
  const terminal = new Terminal();
  bindBoard(terminal, model.leds.relay);
  const ctx: ActionContext = {
    model,
    tweens,
    monitor: monitor as unknown as MonitorScreen,
    terminal,
    seconds: (s) => s,
    flags: new Set(),
    claim: () => () => true,
  };
  // Runs the tweens for `seconds`, a frame at a time.
  const tick = async (seconds: number) => {
    for (let i = 0; i < seconds * 60; i++) {
      tweens.tick(1 / 60);
      await Promise.resolve();
    }
  };
  // Long enough for every sequence to finish (plug-in and boot: ~4 s).
  const settle = () => tick(8);
  return { ctx, monitor, terminal, tick, settle };
}

/** Each relay LED as 1 (lit) or 0, LED_1 first. */
const lit = (model: WorkbenchModel) =>
  model.leds.relay.map((m) => (m.emissiveIntensity > 0 ? 1 : 0)).join("");

const world = (model: WorkbenchModel, name: string) =>
  model.root.getObjectByName(name)?.getWorldPosition(new Vector3());

describe.skipIf(!hasSceneGlb)("scene.glb", () => {
  it("has every station, hit and anchor the Workbench uses", async () => {
    const model = await load();
    for (const id of STATION_IDS) {
      const station = model.stations.get(id);
      expect(station?.corners).toHaveLength(8);
      expect(station?.shot.lens.hfov).toBeGreaterThan(40);
      // Never drawn, even as a depth pass; the raycaster still hits it.
      expect(model.root.getObjectByName(`Zone_${id}`)?.visible).toBe(false);
    }
    expect(model.overview.lens.hfov).toBeCloseTo(72, 3);
    // The stand-in skyline the city hides once it's up.
    expect(model.view?.name).toBe("View");
    for (const id of HIT_IDS) expect(model.hits.has(id)).toBe(true);
    expect(model.hits.get("relay")?.station).toBe("workbench");
    expect(model.hits.get("chess")?.station).toBe("lounge");
    // The tube replaces the stand-in segments.
    expect(model.root.getObjectByName("USB_Cable_0")?.visible).toBe(false);
    const tube = model.cable.mesh.geometry.attributes.position;
    expect(tube.count).toBeGreaterThan(0);
  });

  it("measures the screens in meters", async () => {
    // Positions ship quantized to about ±1 and the node scale carries the
    // size, so a local box alone reads 2 m wide (3400 px canvases).
    const { screens } = await load();
    const size = (name: keyof typeof screens) => [
      screens[name].width,
      screens[name].height,
    ];
    const near = (meters: number) => expect.closeTo(meters, 2);
    expect(size("monitor")).toEqual([near(0.597), near(0.336)]);
    expect(size("laptop")).toEqual([near(0.285), near(0.185)]);
    expect(size("scope")).toEqual([near(0.154), near(0.0924)]);
  });

  it("ships the set dressing merged, and picks through it", async () => {
    const model = await load();
    // A draw call per mesh: merge.py joins the set dressing into a few
    // Static_* meshes, one primitive per material (565 meshes before).
    let meshes = 0;
    model.root.traverse((o) => {
      if (o instanceof Mesh) meshes++;
    });
    expect(meshes).toBeLessThan(250);
    expect(model.root.getObjectByName("Static_Bench")).toBeDefined();

    // From the stool, a ray at the relay board hits the board first.
    const { shot } = model.stations.get("workbench")!;
    const board = model.hits.get("relay")!.group;
    const target = new Box3().setFromObject(board).getCenter(new Vector3());
    const ray = new Raycaster(
      shot.position,
      target.sub(shot.position).normalize(),
    );
    const hit = ray
      .intersectObject(model.root, true)
      .find((h) => !zoneOf(h.object));
    expect(hitIdOf(hit?.object ?? null)).toBe("relay");
  });

  it("plugs the relay in, boots the terminal, and unplugs", async () => {
    const model = await load();
    const { ctx, monitor, terminal, tick, settle } = harness(model);
    const port = world(model, "USB_Port");
    const before = model.cable.mesh.geometry;

    const run = ACTIONS.relay?.play(ctx);
    // Docked, and the LEDs flickered on: all lit while the log types out.
    await tick(1.6);
    expect(world(model, "USB_Plug")?.distanceTo(port!)).toBeLessThan(1e-6);
    model.cable.update();
    expect(model.cable.mesh.geometry).not.toBe(before);
    expect(model.leds.relay).toHaveLength(8);
    for (const led of model.leds.relay) {
      expect(led.emissiveIntensity).toBeGreaterThan(0);
    }
    expect(monitor.boot).toHaveBeenCalledOnce();
    expect(terminal.online).toBe(false);

    // Booted: the session opens on the log, and the LEDs show its mask,
    // every channel off.
    await settle();
    await run;
    expect(terminal.online).toBe(true);
    expect(terminal.rows.map((r) => r.text)).toEqual([...BOOT_LOG, ""]);
    expect(lit(model)).toBe("00000000");

    // The board and the monitor don't unplug it; the cable does.
    await ACTIONS.relay?.play(ctx);
    await ACTIONS.monitor?.play(ctx);
    expect(terminal.online).toBe(true);
    await ACTIONS.usb?.play(ctx);
    expect(model.plug.object.position).toEqual(model.plug.home);
    expect(lit(model)).toBe("00000000");
    expect(terminal.online).toBe(false);
    expect(monitor.idle).toHaveBeenCalled();

    // The monitor plugs it back in.
    void ACTIONS.monitor?.play(ctx);
    await settle();
    expect(terminal.online).toBe(true);
  });

  it("lights the LEDs that relayctl commands set", async () => {
    const model = await load();
    const { ctx, terminal, settle } = harness(model);
    // LED_n is CH n, each with its own material.
    expect(new Set(model.leds.relay).size).toBe(8);
    model.leds.relay.forEach((led, i) => {
      const mesh = model.root.getObjectByName(`LED_${i + 1}`) as Mesh;
      expect(mesh.material).toBe(led);
    });
    const enter = (line: string) => {
      terminal.type(line);
      terminal.submit();
    };

    void ACTIONS.relay?.play(ctx);
    await settle();
    enter("set 3 on");
    expect(lit(model)).toBe("00100000");
    const ch3 = model.leds.relay[2];
    expect(ch3.emissiveIntensity).toBe(ch3.userData.lit);
    enter("write-mask 0xA5");
    expect(lit(model)).toBe("10100101");
    enter("toggle 8");
    expect(lit(model)).toBe("10100100");
    enter("set 12 on");
    expect(lit(model)).toBe("10100100");
    enter("reset");
    expect(lit(model)).toBe("00000000");

    // Unplugging ends the session: mask and screen reset.
    enter("write-mask 0xFF");
    await ACTIONS.usb?.play(ctx);
    expect([terminal.mask, terminal.rows.length]).toEqual([0, 0]);
    expect(lit(model)).toBe("00000000");
  });

  it("hops the knight out and back, and lands the disc", async () => {
    const model = await load();
    const { ctx, settle } = harness(model);
    const knight = model.root.getObjectByName("piece_knight_white_01");
    const home = knight?.position.clone();

    void ACTIONS.chess?.play(ctx);
    await settle();
    const hop = Math.hypot(0.0579, 0.1158);
    expect(knight?.position.distanceTo(home!)).toBeCloseTo(hop, 6);
    void ACTIONS.chess?.play(ctx);
    await settle();
    expect(knight?.position.distanceTo(home!)).toBeLessThan(1e-9);

    const disc = model.root.getObjectByName("Disc");
    const where = disc?.position.clone();
    void ACTIONS.frisbee?.play(ctx);
    await settle();
    expect(disc?.position.distanceTo(where!)).toBeLessThan(1e-9);
  });

  it("ends the small actions where they started", async () => {
    const model = await load();
    const { ctx, settle } = harness(model);
    const grille = model.root.getObjectByName("Mic_Grille");
    const mug = model.hits.get("mug")?.group;
    const scale = grille?.scale.clone();
    const tilt = mug?.quaternion.clone();
    for (const id of ["pi", "mic", "mug"] as const) void ACTIONS[id]?.play(ctx);
    await settle();
    expect(model.leds.pi.emissiveIntensity).toBeGreaterThan(0);
    expect(grille?.scale.distanceTo(scale!)).toBeLessThan(1e-9);
    expect(mug?.quaternion.angleTo(tilt!)).toBeLessThan(1e-6);
  });
});
