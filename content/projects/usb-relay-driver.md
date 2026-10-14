---
title: USB Relay Kernel Driver
summary: A Linux kernel USB driver and CLI that switch SainSmart relay boards from a byte written to /dev.
kind: [systems]
period:
  start: 2025-10
  end: 2025-12
stack: [C, Linux Kernel, USB, FTDI, Make]
status: shipped
featured: true
order: 2
highlights:
  - Kernel module that binds to the board's FTDI FT232R chip and exposes each board as /dev/usbrelayN, using a one-byte relay mask ABI.
  - Enables FTDI bit-bang mode with vendor USB control requests, so all 256 output states fit in a single byte write.
  - Handles hot-plug through probe/disconnect, endpoint discovery, and bulk transfers with 1 s timeouts.
  - Supports up to 4 boards at once, with IDA minor allocation, a mutex per device, and leak-free cleanup on every error path.
  - Includes relayctl, a user-space CLI that turns commands like "set 1 on" into bit masks, with a functional test script.
metrics:
  - label: Hardware
    value: SainSmart 4-ch
  - label: Boards
    value: "4"
    note: max concurrent
  - label: States / byte
    value: "256"
  - label: Transfer timeout
    value: 1 s
links:
  repo: https://github.com/ethandom/SainSmart5VUSBRelayDriver
---
