pragma solidity 0.5.10;

import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Capped.sol';

contract WETH is ERC20Detailed, ERC20Capped{
    constructor()
        ERC20Detailed("Wrapped Ether", "WETH", 18)
        ERC20Capped(100e6 * 1 ether) public {
    }
}