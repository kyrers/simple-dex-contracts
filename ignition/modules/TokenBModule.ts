import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenBModule = buildModule("TokenBModule", (m) => {
  const initialOwner = m.getParameter("initialOwner");
  const tokenB = m.contract("TokenB", [initialOwner]);

  return { tokenB };
});

export default TokenBModule;
