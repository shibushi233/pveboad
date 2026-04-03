# PVE API Baseline

This document defines the PVE API baseline for the lightweight PVE management system.

## Scope

This system only supports the following PVE versions in phase one:

- `8.2.2`
- `9.1.1`

Node onboarding must require the administrator to choose one of the fixed versions above.
The backend must probe the target node version during onboarding.
If the selected version and detected version do not match, the node **must not** be saved.

## Status markers

- `verified-same`: verified to behave consistently across `8.2.2` and `9.1.1`
- `verify-required`: required by the product, but still needs live verification on both versions
- `known-difference`: known or suspected version difference; adapter logic required

## Adapter rule

Business logic must not call raw PVE endpoints directly.
All PVE operations must go through a unified backend PVE client and capability mapping layer.

Recommended capability groups:

- version detection
- node connectivity validation
- VM inventory
- VM power actions
- VM detail
- VM monitoring
- node monitoring
- VNC bootstrap

## Onboarding and version detection

### 1. Detect cluster or node version

Purpose:
- validate node connectivity
- read actual PVE version
- compare detected version against the administrator-selected version

Status:
- `verify-required`

Expected capability:
- fetch version or release metadata from the node after token-based authentication succeeds
- normalize the returned version into a stable comparable value

Implementation requirements:
- store both values:
  - `selected_version`
  - `detected_version`
- block save when they differ
- return a clear Chinese error message in the admin UI

## Required API capability map

## 1. Node validation

### Capability
Validate that the configured node is reachable with the provided API token.

### Product usage
Admin adds a node.

### Required outcome
- base connectivity works
- auth works
- version can be read

### Status
- `verify-required`

## 2. VM inventory

### Capability
List VMs available on a node or cluster and map them to authorized `(node, vmid)` pairs.

### Product usage
- user KVM list page
- permission assignment assistance for admin workflows

### Needed fields
- `vmid`
- `name`
- `node`
- `status`
- `cpus` or equivalent CPU summary
- `maxmem` / memory summary
- disk summary if available
- uptime if available

### Status
- `verify-required`

### Notes
- user-visible data must be filtered by local permission mapping, not by trusting frontend parameters

## 3. VM detail

### Capability
Fetch detail for one authorized KVM.

### Product usage
KVM detail page sections:
- 基本信息
- 系统配置（只读）
- 网卡信息（只读）
- 操作菜单
- 监控标签页

### Needed fields
- identity: node, vmid, name, status
- config summary: cpu, cores, sockets if available, memory, machine/BIOS/type where available
- NIC summary: model, bridge, tag/VLAN, MAC, rate if available
- storage summary: host-visible disk allocation / device summary

### Status
- `verify-required`

## 4. VM power actions

### Capability
Perform VM start / shutdown / stop.

### Product usage
KVM operation menu.

### Required actions
- start
- shutdown
- stop

### Needed behavior
- return task identifier if async
- expose polling or task status lookup through backend if required

### Status
- `verify-required`

### Notes
- destructive operations outside agreed scope must not be exposed in phase one
- no reboot action unless later approved

## 5. VNC / noVNC bootstrap

### Capability
Create the data required for embedded console access.

### Product usage
Embedded VNC console in the KVM detail page.

### Required features
- open embedded console
- fullscreen
- clipboard
- send Ctrl+Alt+Del

### Expected backend role
- request short-lived VNC/noVNC bootstrap data from PVE
- return only the minimum data needed by the frontend
- do not expose long-lived node credentials to the browser

### Status
- `verify-required`

### Notes
- token/cookie handling may differ slightly by PVE version and endpoint behavior; verify on both target versions

## 6. VM current monitoring

### Capability
Fetch current VM metrics for the monitoring tab.

### Product usage
KVM monitoring tab.

### Required metrics in phase one
- CPU
- memory
- disk metrics available from the host/PVE perspective
- basic runtime state

### Status
- `verify-required`

### Notes
- do not promise guest-internal filesystem usage unless guest-agent-based collection is explicitly added later

## 7. Node monitoring (day/week)

### Capability
Fetch node historical monitoring data.

### Product usage
Node monitoring page with day/week tabs.

### Required metrics in phase one
- CPU
- memory
- disk
- network

### Expected source
- PVE RRD/statistics endpoints or equivalent supported monitoring API

### Status
- `verify-required`

### Notes
- charts should tolerate missing samples or sparse data

## Compatibility table

| Capability | 8.2.2 | 9.1.1 | Status | Notes |
| --- | --- | --- | --- | --- |
| Version detection | pending | pending | verify-required | Must block save on mismatch |
| Node validation by token | pending | pending | verify-required | Validate at onboarding |
| VM inventory | pending | pending | verify-required | Must feed authorized user list |
| VM detail | pending | pending | verify-required | Must support read-only config/NIC sections |
| VM power actions | pending | pending | verify-required | Start / shutdown / stop |
| VNC bootstrap | pending | pending | verify-required | Embedded noVNC path |
| VM current monitoring | pending | pending | verify-required | Host-visible metrics only |
| Node day/week monitoring | pending | pending | verify-required | CPU/memory/disk/network |

## Local system rules derived from this baseline

1. Only `8.2.2` and `9.1.1` are valid onboarding choices in phase one.
2. The admin UI must show a fixed selector, not a free-text version input.
3. Backend persistence for nodes must include:
   - selected version
   - detected version
   - validation timestamp
4. Version mismatch must block saving the node.
5. Backend error messages for onboarding must be explicit and Chinese.
6. Every future PVE integration change must update this file before or alongside code changes.

## Verification checklist

For each supported version (`8.2.2`, `9.1.1`), verify:

- token-based authentication works
- detected version parsing is stable
- selected/detected mismatch is rejected
- VM list endpoint returns required fields
- VM detail endpoint returns required fields for the UI
- start / shutdown / stop all behave correctly
- VNC bootstrap works in embedded mode
- current VM monitoring returns usable metrics
- node day/week monitoring returns chartable data

## Open follow-up items

- Replace `pending` entries in the compatibility table after live verification.
- Add endpoint-level request/response examples once the Python backend client is implemented.
- Record any `known-difference` behavior discovered between `8.2.2` and `9.1.1`.
