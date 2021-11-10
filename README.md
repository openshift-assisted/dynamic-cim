# Prepare SDK from openshift/console

1. clone `cim2` branch of OpenShift Console https://github.com/rawagner/console/tree/cim2
2. `cd console`
3. build `console-dynamic-plugin-sdk` https://github.com/rawagner/console/tree/cim/frontend/packages/console-dynamic-plugin-sdk by running `yarn build`
4. prepare link for sdk modules `cd frontend/packages/console-dynamic-plugin-sdk/dist/core && yarn link`, `cd frontend/packages/console-dynamic-plugin-sdk/dist/webpack && yarn link`

# Run dynamic cim plugin

1. `cd dynamic-cim`
2. Link local SDK modules from previous step `yarn link "@openshift-console/dynamic-plugin-sdk" && yarn link "@openshift-console/dynamic-plugin-sdk-webpack"`
3. clone & build `assisted-ui-lib` https://github.com/openshift-assisted/assisted-ui-lib#develop - set `ASSISTED_UI_ROOT` to `../dynamic-cim` . Use https://github.com/openshift-assisted/assisted-ui-lib/pull/601 for latest updates with `infra-hosts` branch https://github.com/rawagner/dynamic-cim/tree/infra_hosts
4. start development server for `dynamic-cim` `yarn dev`

# Start OpenShift Console

1. start the OpenShfit Console and enable `dynamic-cim` plugin `source ./contrib/oc-environment.sh && BRIDGE_BRANDING="okd" && ./bin/bridge -plugins console-dynamic-cim=http://127.0.0.1:9001/`
