import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenBModule = buildModule("TokenBModule", (m) => {
  const tokenB = m.contract("TokenB");
  return { tokenB };
});

export default TokenBModule;
