export const agentcr = {
    "apiVersion": "agent-install.openshift.io/v1beta1",
    "kind": "Agent",
    "metadata": {
      "creationTimestamp": "2021-05-10T14:48:33Z",
      "generation": 2,
      "labels": {
        "agent-install.openshift.io/bmh": "ipv6-spoke1-master1"
      },
      "name": "342bbfa1-45c4-9162-90f0-a62a8889ed79",
      "namespace": "assisted-installer",
      "resourceVersion": "7774966",
      "uid": "e9d4f560-3569-454f-9348-44eb03bd3af6"
    },
    "spec": {
      "approved": true,
      "clusterDeploymentName": {
        "name": "test-cluster-virtual",
        "namespace": "assisted-installer"
      },
      "role": ""
    },
    "status": {
      "conditions": [
        {
          "lastTransitionTime": "2021-05-10T14:48:33Z",
          "message": "The Spec has been successfully applied",
          "reason": "SyncOK",
          "status": "True",
          "type": "SpecSynced"
        },
        {
          "lastTransitionTime": "2021-05-10T14:48:33Z",
          "message": "The agent's connection to the installation service is unimpaired",
          "reason": "AgentIsConnected",
          "status": "True",
          "type": "Connected"
        },
        {
          "lastTransitionTime": "2021-05-10T14:48:56Z",
          "message": "The agent cannot begin the installation because it has already started",
          "reason": "AgentAlreadyInstalling",
          "status": "False",
          "type": "ReadyForInstallation"
        },
        {
          "lastTransitionTime": "2021-05-10T14:48:40Z",
          "message": "The agent's validations are passing",
          "reason": "ValidationsPassing",
          "status": "True",
          "type": "Validated"
        },
        {
          "lastTransitionTime": "2021-05-10T15:21:25Z",
          "message": "The installation has completed: Done",
          "reason": "InstallationCompleted",
          "status": "True",
          "type": "Installed"
        }
      ],
      "hostValidationInfo": {
        "hardware": {},
        "network": {}
      },
      "inventory": {
        "bmcAddress": "10.19.0.35",
        "bmcV6Address": "2620:52:0:1300::35",
        "boot": {
          "currentBootMode": "uefi"
        },
        "cpu": {
          "architecture": "x86_64",
          "clockMegahertz": 3200,
          "count": 32,
          "flags": [
            "fpu",
            "vme",
            "de",
            "pse",
            "tsc",
            "msr",
            "pae",
            "mce",
            "cx8",
            "apic",
            "sep",
            "mtrr",
            "pge",
            "mca",
            "cmov",
            "pat",
            "pse36",
            "clflush",
            "dts",
            "acpi",
            "mmx",
            "fxsr",
            "sse",
            "sse2",
            "ss",
            "ht",
            "tm",
            "pbe",
            "syscall",
            "nx",
            "pdpe1gb",
            "rdtscp",
            "lm",
            "constant_tsc",
            "arch_perfmon",
            "pebs",
            "bts",
            "rep_good",
            "nopl",
            "xtopology",
            "nonstop_tsc",
            "cpuid",
            "aperfmperf",
            "pni",
            "pclmulqdq",
            "dtes64",
            "monitor",
            "ds_cpl",
            "vmx",
            "smx",
            "est",
            "tm2",
            "ssse3",
            "sdbg",
            "fma",
            "cx16",
            "xtpr",
            "pdcm",
            "pcid",
            "dca",
            "sse4_1",
            "sse4_2",
            "x2apic",
            "movbe",
            "popcnt",
            "tsc_deadline_timer",
            "aes",
            "xsave",
            "avx",
            "f16c",
            "rdrand",
            "lahf_lm",
            "abm",
            "cpuid_fault",
            "epb",
            "invpcid_single",
            "pti",
            "ssbd",
            "ibrs",
            "ibpb",
            "stibp",
            "tpr_shadow",
            "vnmi",
            "flexpriority",
            "ept",
            "vpid",
            "ept_ad",
            "fsgsbase",
            "tsc_adjust",
            "bmi1",
            "avx2",
            "smep",
            "bmi2",
            "erms",
            "invpcid",
            "cqm",
            "xsaveopt",
            "cqm_llc",
            "cqm_occup_llc",
            "dtherm",
            "ida",
            "arat",
            "pln",
            "pts",
            "md_clear",
            "flush_l1d"
          ],
          "modelName": "Intel(R) Xeon(R) CPU E5-2630 v3 @ 2.40GHz"
        },
        "disks": [
          {
            "byPath": "/dev/disk/by-path/pci-0000:00:1a.0-usb-0:1.6.4:1.0-scsi-0:0:0:1",
            "driveType": "HDD",
            "hctl": "0:0:0:1",
            "id": "/dev/disk/by-path/pci-0000:00:1a.0-usb-0:1.6.4:1.0-scsi-0:0:0:1",
            "installationEligibility": {
              "notEligibleReasons": [
                "Disk is removable",
                "Disk is too small (disk only has 0 B, but 120 GB are required)"
              ]
            },
            "ioPerf": {},
            "model": "Virtual_Floppy",
            "name": "sda",
            "path": "/dev/sda",
            "serial": "20120731-1",
            "smart": "{\"json_format_version\":[1,0],\"smartctl\":{\"version\":[7,1],\"svn_revision\":\"5022\",\"platform_info\":\"x86_64-linux-4.18.0-240.15.1.el8_3.x86_64\",\"build_info\":\"(local build)\",\"argv\":[\"smartctl\",\"--xall\",\"--json=c\",\"/dev/sda\"],\"messages\":[{\"string\":\"/dev/sda: Unknown USB bridge [0x0624:0x0251 (0x000)]\",\"severity\":\"error\"}],\"exit_status\":1}}",
            "vendor": "iDRAC"
          },
          {
            "bootable": true,
            "byID": "/dev/disk/by-id/wwn-0x6141877052d1e70027a55f9612e5e126",
            "byPath": "/dev/disk/by-path/pci-0000:02:00.0-scsi-0:2:0:0",
            "driveType": "HDD",
            "hctl": "1:2:0:0",
            "id": "/dev/disk/by-id/wwn-0x6141877052d1e70027a55f9612e5e126",
            "installationEligibility": {
              "eligible": true,
              "notEligibleReasons": []
            },
            "ioPerf": {},
            "model": "PERC_H330_Mini",
            "name": "sdb",
            "path": "/dev/sdb",
            "serial": "6141877052d1e70027a55f9612e5e126",
            "sizeBytes": 599550590976,
            "smart": "{\"json_format_version\":[1,0],\"smartctl\":{\"version\":[7,1],\"svn_revision\":\"5022\",\"platform_info\":\"x86_64-linux-4.18.0-240.15.1.el8_3.x86_64\",\"build_info\":\"(local build)\",\"argv\":[\"smartctl\",\"--xall\",\"--json=c\",\"/dev/sdb\"],\"messages\":[{\"string\":\"Smartctl open device: /dev/sdb failed: DELL or MegaRaid controller, please try adding '-d megaraid,N'\",\"severity\":\"error\"}],\"exit_status\":2}}",
            "vendor": "DELL",
            "wwn": 1.2927536191142383e+38
          },
          {
            "byPath": "/dev/disk/by-path/pci-0000:00:1a.0-usb-0:1.6.4:1.0-scsi-0:0:0:0",
            "driveType": "ODD",
            "hctl": "0:0:0:0",
            "id": "/dev/disk/by-path/pci-0000:00:1a.0-usb-0:1.6.4:1.0-scsi-0:0:0:0",
            "installationEligibility": {
              "notEligibleReasons": [
                "Disk is removable",
                "Disk is too small (disk only has 106 MB, but 120 GB are required)",
                "Drive type is ODD, it must be one of HDD, SSD."
              ]
            },
            "ioPerf": {},
            "model": "Virtual_CD",
            "name": "sr0",
            "path": "/dev/sr0",
            "serial": "20120731-1",
            "sizeBytes": 105809920,
            "smart": "{\"json_format_version\":[1,0],\"smartctl\":{\"version\":[7,1],\"svn_revision\":\"5022\",\"platform_info\":\"x86_64-linux-4.18.0-240.15.1.el8_3.x86_64\",\"build_info\":\"(local build)\",\"argv\":[\"smartctl\",\"--xall\",\"--json=c\",\"/dev/sr0\"],\"exit_status\":4},\"device\":{\"name\":\"/dev/sr0\",\"info_name\":\"/dev/sr0\",\"type\":\"scsi\",\"protocol\":\"SCSI\"},\"vendor\":\"iDRAC\",\"product\":\"Virtual CD\",\"model_name\":\"iDRAC Virtual CD\",\"revision\":\"0329\",\"user_capacity\":{\"blocks\":51665,\"bytes\":105809920},\"logical_block_size\":2048,\"device_type\":{\"scsi_value\":5,\"name\":\"CD/DVD\"},\"local_time\":{\"time_t\":1620658799,\"asctime\":\"Mon May 10 14:59:59 2021 UTC\"},\"temperature\":{\"current\":0,\"drive_trip\":0}}",
            "vendor": "iDRAC"
          }
        ],
        "hostname": "openshift-master-1.mgmt-spoke1.e2e.bos.redhat.com",
        "interfaces": [
          {
            "biosDevName": "em1",
            "flags": [
              "up",
              "broadcast",
              "multicast"
            ],
            "ipV4Addresses": [],
            "ipV6Addresses": [],
            "macAddress": "f8:bc:12:0e:88:80",
            "mtu": 1500,
            "name": "eno1",
            "product": "0x1581",
            "speedMbps": -1,
            "vendor": "0x8086"
          },
          {
            "biosDevName": "em2",
            "flags": [
              "up",
              "broadcast",
              "multicast"
            ],
            "ipV4Addresses": [],
            "ipV6Addresses": [],
            "macAddress": "f8:bc:12:0e:88:82",
            "mtu": 1500,
            "name": "eno2",
            "product": "0x1581",
            "speedMbps": -1,
            "vendor": "0x8086"
          },
          {
            "biosDevName": "em3",
            "flags": [
              "up",
              "broadcast",
              "multicast"
            ],
            "ipV4Addresses": [],
            "ipV6Addresses": [],
            "macAddress": "f8:bc:12:0e:88:84",
            "mtu": 1500,
            "name": "eno3",
            "product": "0x1581",
            "speedMbps": -1,
            "vendor": "0x8086"
          },
          {
            "biosDevName": "p2p1",
            "flags": [
              "up",
              "broadcast",
              "multicast"
            ],
            "hasCarrier": true,
            "ipV4Addresses": [],
            "ipV6Addresses": [
              "2620:52:0:1303::6/64",
              "2620:52:0:1303:8058:2bde:661d:51f/64"
            ],
            "macAddress": "a0:36:9f:6c:0c:10",
            "mtu": 1500,
            "name": "enp3s0f0",
            "product": "0x1523",
            "speedMbps": 1000,
            "vendor": "0x8086"
          },
          {
            "biosDevName": "em4",
            "flags": [
              "up",
              "broadcast",
              "multicast"
            ],
            "ipV4Addresses": [],
            "ipV6Addresses": [],
            "macAddress": "f8:bc:12:0e:88:86",
            "mtu": 1500,
            "name": "eno4",
            "product": "0x1581",
            "speedMbps": -1,
            "vendor": "0x8086"
          },
          {
            "biosDevName": "p2p2",
            "flags": [
              "up",
              "broadcast",
              "multicast"
            ],
            "ipV4Addresses": [],
            "ipV6Addresses": [],
            "macAddress": "a0:36:9f:6c:0c:11",
            "mtu": 1500,
            "name": "enp3s0f1",
            "product": "0x1523",
            "speedMbps": -1,
            "vendor": "0x8086"
          },
          {
            "biosDevName": "p2p3",
            "flags": [
              "up",
              "broadcast",
              "multicast"
            ],
            "ipV4Addresses": [],
            "ipV6Addresses": [],
            "macAddress": "a0:36:9f:6c:0c:12",
            "mtu": 1500,
            "name": "enp3s0f2",
            "product": "0x1523",
            "speedMbps": -1,
            "vendor": "0x8086"
          },
          {
            "biosDevName": "p2p4",
            "flags": [
              "up",
              "broadcast",
              "multicast"
            ],
            "ipV4Addresses": [],
            "ipV6Addresses": [],
            "macAddress": "a0:36:9f:6c:0c:13",
            "mtu": 1500,
            "name": "enp3s0f3",
            "product": "0x1523",
            "speedMbps": -1,
            "vendor": "0x8086"
          }
        ],
        "memory": {
          "physicalBytes": 137438953472,
          "usableBytes": 134940717056
        },
        "systemVendor": {
          "manufacturer": "Dell Inc.",
          "productName": "PowerEdge M630",
          "serialNumber": "6TC8182"
        }
      },
      "progress": {}
    }
  }