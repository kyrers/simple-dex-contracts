import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenAModule = buildModule("TokenAModule", (m) => {
  const initialOwner = m.getParameter("initialOwner");
  const tokenA = m.contract("TokenA", [initialOwner]);

  return { tokenA };
});

export default TokenAModule;
