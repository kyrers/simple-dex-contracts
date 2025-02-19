import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenAModule = buildModule("TokenAModule", (m) => {
  const tokenA = m.contract("TokenA");
  return { tokenA };
});

export default TokenAModule;
