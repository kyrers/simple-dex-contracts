# Simple Dex Contracts

This repository contains three contracts: `TokenA`, `TokenB`, and `SimpleDex`.

`TokenA` and `TokenB` are simple `ERC20` tokens that allow anyone to mint them. `SimpleDex` aims to simulate a very simple DEX, where users can add/remove liquidity and swap between tokens A and B.

This is an experimental/learning project, and some crucial decisions were made:

1. The DEX must maintain a constant ratio of token reserves using the constant product formulate `x*y=k`;
2. The ratio is defined by whoever adds liquidity first. If the first user to add liquidity adds `100 TokenA` and `200 TokenB`, this 1:2 ratio must be maintained forever, regardless of the action users execute.

### Deploy the contracts

There is a script to deploy the contracts and set everything up. It uses Hardhat `Ignition` modules to deploy the contracts. For different networks, you need to configure them in the `hardhat.config.ts` file.
After that, run:

```
$ npx hardhat run scripts/deploy.ts --network networkName
```

#### [kyrers](https://twitter.com/kyre_rs)
