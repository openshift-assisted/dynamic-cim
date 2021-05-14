# dynamic-cim

1. clone `cim` branch of OpenShift Console https://github.com/rawagner/console/tree/cim
2. build `console-dynamic-plugin-sdk` https://github.com/rawagner/console/tree/cim/frontend/packages/console-dynamic-plugin-sdk by running `yarn build`
3. link the build with `dynamic-cim` node_modules
4. clone & build `assisted-ui-lib` https://github.com/openshift-assisted/assisted-ui-lib#develop - set `ASSISTED_UI_ROOT` to `../dynamic-cim` . Use https://github.com/openshift-assisted/assisted-ui-lib/pull/601 for latest updates with `infra-hosts` branch https://github.com/rawagner/dynamic-cim/tree/infra_hosts
5. start development server for `dynamic-cim` `yarn dev`
6. start the OpenShfit Console and enable `dynamic-cim` plugin `source ./contrib/oc-environment.sh && BRIDGE_BRANDING="okd" && ./bin/bridge -plugins console-dynamic-cim=http://127.0.0.1:9001/`
