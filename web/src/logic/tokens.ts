import Base from '../assets/icons/base.png';
import Celo from '../assets/icons/celo.jpg';
import ETH from '../assets/icons/eth.svg';
import Gnosis from '../assets/icons/gno.svg';
import Matic from '../assets/icons/matic.svg';
import USDT from '../assets/icons/usdt.svg';
import EURe from '../assets/icons/eure.svg';
import USDe from '../assets/icons/usde.svg';


export const badgeIcons = [
    { ids: ['84532', '8453'], img: Base },
    { ids: ['11155111', '5', '1'], img: ETH },
    { ids: ['100'], img: 'https://app.safe.global/images/networks/gno.png' },
    { ids: ['42220'], img: Celo },
    { ids: ['1101', '137', '80001'], img: Matic },
    // Add more mappings as needed
  ];


export function getIconForId(id: any) {
    for (const icon of badgeIcons) {
      if (icon.ids.includes(id.toString())) {
        return icon.img;
      }
    }
      // Return a default icon or handle the case when no mapping is found
  return 'defaultIcon';
}


export const tokenList: any = {

  
  11155111: [
    {
        value: '0x0000000000000000000000000000000000000000',
        label: 'ETH',
        image: ETH,
        description: 'Ether currency',
      },     
      {
        value: '0xd58C5Db52B5B3Eb24EE38AF287d2cb0F424172A5',
        label: 'EURe',
        image: EURe,
        description: 'Monerium EUR emoney',
      },   
      {
        value: '0x8bA8662a7C5C6Be4B4ad7049c5DbF59aaCC2cf1e',
        label: 'USDe',
        image: USDe,
        description: 'Monerium USD emoney',
      },                                                                                                                                                                                                                                                                                                    

  ],
  84532: [
    {
        value: '0x0000000000000000000000000000000000000000',
        label: 'ETH',
        image: ETH,
        description: 'Ether currency',
      },                                                                                                    

  ],

  8453: [
    {
        value: '0x0000000000000000000000000000000000000000',
        label: 'ETH',
        image: ETH,
        description: 'Ether currency',
      },   
      {
        value: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        label: 'USDC',
        image: USDe,
        description: 'Circle USDS token',
      },                                                                                                   

  ],


}


export  const getTokenInfo = (chainId: number, token: string) => 

{
    try{ 
    if(Object.keys(tokenList).includes(chainId.toString())) {

        return tokenList[chainId].find((item: any) => item.value.toLowerCase() == token?.toLowerCase());

    }
   }
   catch(e) {
       console.log('Error getting token info')
   }
    
    return {};
}

export  const getTokenList = (chainId: number) => 

{
    if(Object.keys(tokenList).includes(chainId.toString())) {

        return tokenList[chainId];

    }
   
    return [];
}