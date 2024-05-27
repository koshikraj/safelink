import { Text, ActionIcon, Alert, Anchor, Avatar, Badge, Button, CopyButton, Divider, Input, Modal, Paper, Popover, rem, Tooltip, InputBase, Combobox, useCombobox, Group, TextInput, Skeleton, Stepper, Timeline, Code, ThemeIcon, Progress, Stack } from '@mantine/core';
import classes from './claim.module.css';
import { useEffect, useState } from 'react';
import useLinkStore from '@/store/account/account.store';
import { formatEther, parseEther, parseUnits, ZeroAddress } from 'ethers';
import { buildTransferToken, fixDecimal, formatTime, getTokenBalance, getTokenDecimals, passkeyHttpClient, publicClient } from '@/logic/utils';
import { useDisclosure } from '@mantine/hooks';
import {  IconBug, IconCheck, IconChevronDown, IconClock, IconCoin, IconConfetti, IconCopy, IconCross, IconDownload, IconError404, IconGif, IconGift, IconHomeDown, IconSend, IconShieldCheck, IconTransferOut, IconUserCheck } from '@tabler/icons';
import { NetworkUtil } from '@/logic/networks';
import Confetti from 'react-confetti';
import { getIconForId, getTokenInfo, getTokenList, tokenList } from '@/logic/tokens';
import { getJsonRpcProvider } from '@/logic/web3';

import { generateKeysFromString, getSessionData ,sendTransaction } from '@/logic/module';
import { loadAccountInfo, storeAccountInfo } from '@/utils/storage';


import Passkey from '../../assets/icons/passkey.svg';
import { useSearchParams } from 'react-router-dom';
import { addWebAuthnData, create, getWebAuthnData, getWebAuthnDataByAccount, login } from '@/logic/passkey';
import { get } from 'http';
import { waitForExecution } from '@/logic/permissionless';
import { ethers } from 'ethersv5';




export const ClaimPage = () => {


  
  const { authDetails, setAuthDetails, chainId, setChainId, setConfirming, confirming} = useLinkStore((state: any) => state);
  const [searchParams, setSearchParams] = useSearchParams();

  const [opened, { open, close }] = useDisclosure(false);
  const [sendModal, setSendModal] = useState(false);
  const [tokenValue, setTokenValue] = useState('');

  const [sendAddress, setSendAddress] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [sendLoader, setSendLoader] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [value, setValue] = useState<string>("0x0000000000000000000000000000000000000000");
  const [walletProvider, setWalletProvider] = useState<any>();
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionKeyActive, setSessionKeyActive] = useState(false);
  const [availableAmount, setAvailableAmount] = useState(''); 
  const [safeAccount, setSafeAccount] = useState('');
  const [validTill, setValidTill] = useState(0);
  const [validAfter, setValidAfter] = useState(0);
  const [linkLoading, setLinkLoading] = useState(true);
  const [error, setError ] = useState('');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [queryParams, setQueryParams] = useState<any>({key: '', chainId: ''});


  const availableTestChains = Object.keys(tokenList).filter(chainId => NetworkUtil.getNetworkById(
    Number(chainId)
  )?.type == 'testnet').map(
    (chainId: string) => 
    ({label: `${NetworkUtil.getNetworkById(Number(chainId))?.name}`, type: `${NetworkUtil.getNetworkById(
      Number(chainId)
    )?.type}`, image: getIconForId(chainId), value: chainId }))

    const availableMainnetChains = Object.keys(tokenList).filter(chainId => NetworkUtil.getNetworkById(
      Number(chainId)
    )?.type == 'mainnet').map(
      (chainId: string) => 
      ({label: `${NetworkUtil.getNetworkById(Number(chainId))?.name}`, type: `${NetworkUtil.getNetworkById(
        Number(chainId)
      )?.type}`, image: getIconForId(chainId), value: chainId }))
  
  
  const mainnetOptions = availableMainnetChains.map((item: any) => (
    <Combobox.Option value={item.value} key={item.value}>
      <SelectOption {...item} />
    </Combobox.Option>
  ));

  const testnetOptions = availableTestChains.map((item: any) => (
    <Combobox.Option value={item.value} key={item.value}>
      <SelectOption {...item} />
    </Combobox.Option>
  ));

  const options = (<Combobox.Options>
          <Combobox.Group >
            {mainnetOptions}
          </Combobox.Group>

          <Combobox.Group label="TESTNETS">
          {testnetOptions}
          </Combobox.Group>
        </Combobox.Options>)

  const chainCombobox = useCombobox({
    onDropdownClose: () => chainCombobox.resetSelectedOption(),
  });
  const tokenCombobox = useCombobox({
    onDropdownClose: () => tokenCombobox.resetSelectedOption(),
  });

  interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
    image: string
    label: string
    description: string
  }
  

  function SelectOption({ image, label }: ItemProps) {
    return (
      <Group style={{width: '100%'}}>
        <Avatar src={image} >
        <IconCoin size="1.5rem" />
        </Avatar>
        <div >
          <Text fz="sm" fw={500}>
            {label}
          </Text>
        </div>
      </Group>
    );
  }


  const selectedToken = getTokenInfo(chainId, value);

  const tokenOptions = getTokenList(chainId).map((item: any) => (
    <Combobox.Option value={item.value} key={item.value}>
      <TokenOption {...item} />
    </Combobox.Option>
  ));

  interface TokenProps extends React.ComponentPropsWithoutRef<'div'> {
    image: string
    label: string
    description: string
  }

   
  function TokenOption({ image, label }: TokenProps) {
    return (
      <Group style={{width: '100%'}}>
        <Avatar src={image} >
        <IconCoin size="1.5rem" />
        </Avatar>
        <div >
          <Text fz="sm" fw={500}>
            {label}
          </Text>
        </div>
      </Group>
    );
  }

  function getAllQueryParameters(url: any) {
    const queryString = url.split('?')[1];
    if (!queryString) {
      return null;
    }

    const params = new URLSearchParams(queryString);
    const parameters: any = {};

    for (const [key, value] of params.entries()) {
      parameters[key] = value;
    }

    return parameters;
  }

  async function sendAsset() {

    setSendLoader(true);
    setSendSuccess(false);
    setError('');
    try {

    let parseAmount, data='0x', toAddress = sendAddress ;
    if(value == ZeroAddress) {
            parseAmount = parseEther(tokenValue.toString());
        } else {
          const provider = await getJsonRpcProvider(chainId.toString())
            parseAmount = parseUnits(tokenValue.toString(), await  getTokenDecimals(value, provider))
            data = await buildTransferToken(value, toAddress, parseAmount, provider)
            parseAmount = 0n;
            toAddress = value;
        }
        
    const result = await sendTransaction(chainId.toString(), toAddress, parseAmount, walletProvider, safeAccount)
    if (!result)
    setSendSuccess(false);
    else {
    setSendSuccess(true);
    setSendModal(false);
    setConfirming(true);
    await waitForExecution(chainId, result);
    setConfirming(false);
    }
  } catch(e) {
    console.log('Something went wrong!', e)
    setSendLoader(false);  
    setError('Oops! Gremlins have invaded your transaction. Please try again later.');
  }  
  setSendLoader(false);

  }

  async function fetchSessionData(sessionKey: string, chainId: string) {

    
    setSessionLoading(true);
    const {validAfter, validUntil, limitAmount, limitUsed, account} = await getSessionData(chainId, sessionKey, ZeroAddress);

    const currentTime = Date.now();
    const availableLimit =  limitAmount - limitUsed;

    setValidAfter(parseInt(validAfter));
    setValidTill(parseInt(validUntil));
    setSessionKeyActive(currentTime < parseInt(validUntil)*1000 && currentTime > parseInt(validAfter)*1000);
    setAvailableAmount(formatEther(availableLimit));
    setTokenValue(formatEther(availableLimit));
    setSessionLoading(false);
    setSafeAccount(account);

  }


  useEffect(() => {
    (async () => {


      const qParams: any = getAllQueryParameters(window.location.href);
      setQueryParams(qParams);
      setChainId(qParams.chainId)

      const { privateKey, address }=  generateKeysFromString(qParams.key);

      await fetchSessionData(address, qParams.chainId);
      setWalletProvider(new ethers.Wallet(privateKey))
      setLinkLoading(false);
      window.addEventListener('resize', () => setDimensions({ width: window.innerWidth, height: window.innerHeight }));

    
    })();
  }, [confirming]);




  return (
    <>

<Modal opened={sendModal} onClose={()=>{ setSendModal(false); setSendSuccess(false); setValue(ZeroAddress);}} title="Transfer your crypto" centered>

<div className={classes.formContainer}>
      <div>
        <h1 className={classes.heading}>Send crypto anywhere</h1>
      </div>
      <p className={classes.subHeading}>
        Send your crypto gas free.
      </p>
      <div className={classes.inputContainer}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '20px',
                  alignItems: 'center',
                }}
              >
                  <Combobox
                        store={tokenCombobox}
                        withinPortal={false}
                        onOptionSubmit={(val) => {
                          setValue(val);
                          tokenCombobox.closeDropdown();
                        }}
                      >
                        <Combobox.Target>
                          <InputBase
                          style={{width: '50%'}}
                            component="button"
                            type="button"
                            pointer
                            rightSection={<Combobox.Chevron />}
                            onClick={() => tokenCombobox.toggleDropdown()}
                            rightSectionPointerEvents="none"
                            multiline
                          >
                            {selectedToken ? (
                              <TokenOption {...selectedToken} />
                            ) : (
                              <Input.Placeholder>Pick Token</Input.Placeholder>
                            )} 
                          </InputBase>
                        </Combobox.Target>

                        <Combobox.Dropdown>
                          <Combobox.Options>{tokenOptions}</Combobox.Options>
                        </Combobox.Dropdown>
                      </Combobox>

             
                <Input
                  style={{ width: '40%'}}
                  type="number"
                  size='lg'
                  value={tokenValue}
                  onChange={(e: any) => setTokenValue(e?.target?.value)}
                  placeholder="Value"
                  className={classes.input}
                />
                


              </div>
              <Text size="sm" style={{cursor: 'pointer'}} onClick={()=>{ setTokenValue(availableAmount)}}>
              { balanceLoading ? <Skeleton height={15} width={90} mt={6} radius="xl" /> : `Balance: ${availableAmount} ${getTokenInfo(chainId, value)?.label}` } 
              </Text>

              <Input
                  type="string"
                  style={{ marginTop: '20px'}}
                  size='lg'
                  value={sendAddress}
                  onChange={(e: any) => setSendAddress(e?.target?.value)}
                  placeholder="Recipient Address"
                  className={classes.input}
                />

            </div>
            
              <Button
              size="lg" radius="md" 
              style={{marginBottom: '20px'}}
              fullWidth
              color="green"
              className={classes.btn}
              onClick={async () => 
                await sendAsset()}
              loaderProps={{ color: 'white', type: 'dots', size: 'md' }}
              loading={sendLoader}
            >
              Send Now
            </Button>


      { sendSuccess && <Alert variant="light" color="lime" radius="md" title="Transfer Successful" icon={<IconConfetti/>}>
      Your crypto assets have safely landed in the Success Galaxy. Buckle up for a stellar financial journey! 🚀💰
    </Alert>
      }

{ error && <Alert variant="light" color="red" radius="md" title="Transfer Error" icon={<IconBug/>}>
      {error}
    </Alert>
      }
            
    </div>
  
</Modal>

    <Paper className={classes.accountContainer} shadow="md" withBorder radius="md" p="xl" >
      
      <div className={classes.formContainer}>

      { linkLoading ? <><Skeleton style={{marginBottom: '10px'}} height={20} width={200} mt={6} radius="xl" /> 
          <Skeleton style={{marginBottom: '20px'}} height={20} width={200} mt={6} radius="xl" /> 
          <Skeleton style={{marginBottom: '20px'}} height={40} width={150} mt={6} radius="md" />
          </>
          :
             <>
            { parseFloat(availableAmount) && sessionKeyActive ? 
            
            <div>
            <h1 className={classes.claimHeading}>
              You have 
              <h1 className={classes.claimInner}>
              {availableAmount ? availableAmount : 0}{' '}
            
              {getTokenInfo(chainId, ZeroAddress)?.label}  <Avatar src={getTokenInfo(chainId, ZeroAddress)?.image} ></Avatar>
              
           
              </h1>
           
            </h1>
            <h1 className={classes.links}> to claim  🎉 😍
            </h1>
            
          </div> :
            <div>
            <h1 className={classes.claimHeading}>
              Looks like there is nothing to claim
            </h1>
           <h1 className={classes.links}> 👀 😢
            </h1>   
          </div> 
          }
          

         { Boolean(parseFloat(availableAmount)) && sessionKeyActive  && <Button
            size="lg" radius="md" 
            style={{width: '50%', marginTop: "20px"}}
            fullWidth
            color="teal"
            type="button"
            className={classes.btn}
            onClick={async () => {
              setSendModal(true);

            }}
          >
            Claim Now
          </Button> }</>}

      </div>
    </Paper>
    </>
  );
};