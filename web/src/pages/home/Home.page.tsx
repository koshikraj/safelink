import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Text,
  Group,
  Input,
  Paper,
  Select,
  useMantineColorScheme,
  Combobox,
  useCombobox,
  InputBase,
  Anchor,
  Alert,
  TextInput,
  Stepper,
  rem,
  Checkbox,
  Stack,
} from '@mantine/core';
import classes from './Home.module.css';
import ETHIndia from '../../assets/images/ethindia.svg';
import Safe from '../../assets/images/safe.svg';

import { NetworkUtil } from '../../logic/networks';
import { useDisclosure } from '@mantine/hooks';
import { DateTimePicker } from '@mantine/dates';
import {  createSessionKey } from '../../logic/module';
import { ZeroAddress } from 'ethers';

import Confetti from 'react-confetti';
import { IconBrandGithub, IconCoin, IconUserCheck} from '@tabler/icons';


import { useNavigate } from 'react-router-dom';
import { getProvider } from '@/logic/web3';
import { getIconForId, getTokenInfo, getTokenList, tokenList } from '@/logic/tokens';

import {CopyToClipboard} from 'react-copy-to-clipboard';
import { getSafeInfo, isConnectedToSafe } from '@/logic/safeapp';
import { formatTime, getTokenBalance } from '@/logic/utils';
import { createPublicClient, formatEther, http } from 'viem';
import { IconBrandTwitterFilled, IconBrandX } from '@tabler/icons-react';

import useLinkStore from '@/store/account/account.store';


function HomePage() {
  const [opened, { open, close }] = useDisclosure(false);
  const navigate = useNavigate();
  


  const { colorScheme } = useMantineColorScheme();

  const dark = colorScheme === 'dark';

  const { chainId, setChainId} = useLinkStore((state: any) => state);


  const [tokenValue, setTokenValue] = useState('0');
  const [safeAccount, setSafeAccount] = useState('');
  const [enableData, setEnableData] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [validAfter, setValidAfter] = useState(Math.floor(Date.now()/1000));
  const [validUntil, setValidUntil] = useState(Math.floor(Date.now()/1000) + 86400);
  const [seletcedToken, setSelectedToken] = useState<string | null>('');

  const [network, setNetwork] = useState('');
  const [sessionCreated, setSessionCreated] = useState(false);
  const [sessionKey, setSessionKey] = useState('');
  const [sharableLink, setSharableLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [safeError, setSafeError] = useState(false);
  const [copied, setCopied] = useState(false);



  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [value, setValue] = useState<string>("0x0000000000000000000000000000000000000000");
  const [ balance, setBalance ] = useState<any>(0);
  const [active, setActive] = useState(0);

  const selectedOption = getTokenInfo(chainId, value);

  const options = getTokenList(chainId).map((item: any) => (
    <Combobox.Option value={item.value} key={item.value}>
      <SelectOption {...item} />
    </Combobox.Option>
  ));

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




  const create = async () => {
    setIsLoading(true);
    try {
      const key = await createSessionKey(
        value,
        tokenValue, 
        0,
        validAfter,
        validUntil
      );
      const queryString = new URLSearchParams({key, chainId})?.toString();
      const url = `${window.location.href}#/claim?${queryString}`;
      setSharableLink(url);
      setIsLoading(false);
      setActive(1);
    } catch (e) { 
      setIsLoading(false);
      setSafeError(true);
    }
    setSessionCreated(true);
  };


 
  useEffect(() => {
    (async () => {
      try {
        const provider = await getProvider();

        const chainId = (await provider.getNetwork()).chainId;

        setChainId(Number(chainId));
        setNetwork(
          `${NetworkUtil.getNetworkById(Number(chainId))?.name}`
        );

        const safeInfo = await getSafeInfo();
        setSafeAccount(safeInfo?.safeAddress);
        if(value == ZeroAddress) {
        setBalance(parseFloat(formatEther(await provider.getBalance(safeInfo?.safeAddress))).toFixed(4))
        } else {
        setBalance(await getTokenBalance(value, safeInfo?.safeAddress, provider))
        }
        }
        catch(e)
        {
          console.log('No safe found')
          setSafeError(true);
        }
        
    })();
  }, [value]);

  return (
    <>
        <div>      

          <h1 className={classes.heading}>Share crypto from your
          <div className={classes.safeContainer}>
          <img
          className={classes.safe}
          src={Safe}
          alt="avatar"
          />
          </div>
          </h1>
          <h1 className={classes.links}>via links 🔗

          </h1>
</div>
        <>
      <div className={classes.homeContainer}>
    <Paper className={classes.formContainer} shadow="md" withBorder radius="md" p="xl" >
        { !Object.keys(tokenList).includes(chainId.toString()) && <Alert variant="light" color="yellow" radius="lg" title="Unsupported Network">
      Safe link App supports only these networks as of now <b> : <br/> {Object.keys(tokenList).map((chainId) => `${NetworkUtil.getNetworkById(Number(chainId))?.name} ${NetworkUtil.getNetworkById(Number(chainId))?.type}, `)} </b>
    </Alert> }

    { safeError && <Alert variant="light" color="yellow" radius="lg" title="Open as Safe App">

     Try this application as a <span/>
      <Anchor href="https://app.safe.global/share/safe-app?appUrl=https://safe-passkey.zenguard.xyz&chain=sep">
      Safe App
        </Anchor> <span/>
        on Safe Wallet.
      
    </Alert> }


        <div className={classes.inputContainer}>

        <Stepper size="sm" active={active} color='green' >
        <Stepper.Step label="Create link" description="Select crypto asset and amount">
        <div className={classes.inputContainer}>


          <div
             style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '20px',
              marginBottom: '20px',
              // alignItems: 'center',
            }}
          
          >
            <Stack
                  style={{
                    width: '40%',
                  }}
             
              >
                   <Input.Wrapper label={`Select Asset `} >
                  <Combobox
                        store={combobox}
                        withinPortal={false}
                        onOptionSubmit={(val) => {
                          setValue(val);
                          combobox.closeDropdown();
                        }}
                      >
                        <Combobox.Target>
                          <InputBase
                          // style={{width: '50%'}}
                            component="button"
                            type="button"
                            pointer
                            rightSection={<Combobox.Chevron />}
                            onClick={() => combobox.toggleDropdown()}
                            rightSectionPointerEvents="none"
                            multiline
                          >
                            {selectedOption ? (
                              <SelectOption {...selectedOption} />
                            ) : (
                              <Input.Placeholder>Pick value</Input.Placeholder>
                            )} 
                          </InputBase>
                        </Combobox.Target>

                        <Combobox.Dropdown>
                          <Combobox.Options>{options}</Combobox.Options>
                        </Combobox.Dropdown>
                      </Combobox>
                      </Input.Wrapper>

                <Badge
                  pl={0}
                  color="gray"
                  variant="light"
                  leftSection={
                    <Avatar alt="Avatar for badge" size={20} mr={5} src={getIconForId(chainId)} />
                  }
                  size="sm"
                  className={classes.network}
                
                >
                  {network}
                </Badge>
              </Stack>
         

              <Input.Wrapper label={`Amount `} style={{
                    width: '40%',
                  }}>
                <TextInput
                  type="number"
                  size="lg"
                  value={tokenValue}
                  onChange={(e) => setTokenValue(e?.target?.value)}
                  placeholder="Enter the amount"
                  className={classes.input}
                  description={`Balance: ${balance}`}
                  inputWrapperOrder={['label', 'input', 'description']}
                />
              </Input.Wrapper>
              </div>

              <Button
              size="lg" radius="md" 
              fullWidth
              color="green"
              className={classes.btn}
              onClick={create}
              loaderProps={{ color: 'white', type: 'dots', size: 'md' }}
              loading={isLoading}
            >
              {isLoading ? 'Creating Link ...' : 'Create Link'}
            </Button>     


              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '20px',
                  marginBottom: '20px',
                  alignSelf: 'center',
                }}
              >

            <Input.Wrapper style={{color: 'grey'}} >  
              <DateTimePicker variant="unstyled" size="sm"  description="" valueFormat="DD MMM YYYY, hh:mm A" value={new Date(validUntil*1000)}  label="The link will be valid until (Click to change)" placeholder="Pick date and time" onChange={(time)=>setValidUntil(Math.floor(time!.getTime()/1000))} />
              </Input.Wrapper> 
              </div>


            </div>



            <br/>


        </Stepper.Step>
        <Stepper.Step label="Share link" description="Share this link to claim crypto">
        <div>

              <h1 className={classes.heading} style={{fontSize: 30}}>Safe link is Ready!</h1>

              <p className={classes.subheading} style={{ textAlign: 'center' }}>
                
               This link account is like a magic wand. Check out the magic of this link <Anchor target='_blank' href={sharableLink} >here </Anchor> ❤️ ❤️
              </p>


              <div className={classes.copyContainer}>
                <Input
                  className={classes.input}
                  // style={{ width: '400px' }}
                  value={sharableLink}
                  placeholder={sharableLink}
                />
            
              </div>
              <div className={classes.actions}>
            
            <Button size="lg" radius="md"
              onClick={() => setActive(0)}
             style={{ width: '180px' }}        
                color={ dark ? "#49494f" : "#c3c3c3" } 
                variant={ "filled" } 
               >Create New</Button>


               <CopyToClipboard text={sharableLink}
                onCopy={() => setCopied(true)}>
          <Button size="lg" radius="md" style={{ width: '180px' }}  color="teal">
          {copied ? 'Link Copied' : 'Copy Link'}
            </Button>
            </CopyToClipboard >
          </div>

          </div>
        </Stepper.Step>
        <Stepper.Completed>
          Completed, click back button to get to previous step
        </Stepper.Completed>
      </Stepper>

      </div> 
          
    </Paper>
          
        </div>
     
        </>
      
             
             <div className={classes.avatarContainer}>

            <Group className={classes.mode}>
            {/* <Group className={classes.container} position="center"> */}
            <IconBrandX 
            size={30}
            stroke={1.5}
            onClick={() => window.open("https://x.com/zenguardxyz")}
            style={{ cursor: 'pointer' }}
            />
            <IconBrandGithub
            size={30}
            stroke={1.5}
            onClick={() => window.open("https://github.com/koshikraj/safe-link")}
            style={{ cursor: 'pointer' }}
            />

            {/* </Group> */}
            {/* </Group> */}
            </Group>
            </div>
    </>
  );
}

export default HomePage;

// show dropdown. no model. list all token
