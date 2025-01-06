import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SimpleDexModule = buildModule("SimpleDexModule", (m) => {
  const tokenAAddress = m.getParameter("tokenAAddress");
  const tokenBAddress = m.getParameter("tokenBAddress");

  const simpleDex = m.contract("SimpleDex", [tokenAAddress, tokenBAddress]);

  return { simpleDex };
});

export default SimpleDexModule;
