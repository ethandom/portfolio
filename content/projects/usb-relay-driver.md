---
title: USB Relay Kernel Driver
summary: A Linux kernel driver and CLI for USB relay boards.
kind: [systems]
period:
  start: 2025-10
  end: 2025-12
stack: [C, Linux Kernel, USB, FTDI, Make]
status: shipped
featured: true
order: 2
figure: relay-rig
highlights:
  - Kernel module that binds to the board's FTDI FT232R chip and exposes each board as /dev/usbrelayN, with a one-byte mask ABI that drives all 8 channels.
  - Enables FTDI bit-bang mode with vendor USB control requests, so all 256 output states fit in a single byte write.
  - Handles hot-plug through probe/disconnect, endpoint discovery, and bulk transfers with 1 s timeouts.
  - Supports up to 4 boards at once, with IDA minor allocation, a mutex per device, and leak-free cleanup on every error path.
  - Includes relayctl, a user-space CLI that turns commands like "set 1 on" into bit masks, with a functional test script.
metrics:
  - label: Channels
    value: "8"
    note: per board
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
