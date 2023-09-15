import { EC2Client, DescribeSecurityGroupsCommand, RevokeSecurityGroupIngressCommand, AuthorizeSecurityGroupIngressCommand } from "@aws-sdk/client-ec2";
import { STSClient, GetSessionTokenCommand } from "@aws-sdk/client-sts";
import ProgressBar from 'progress';
import fetch from 'node-fetch';

import config from './config.json' assert { type: 'json' };

const ec2 = new EC2Client({ region: config.account.region, credentials: { accessKeyId: config.account.accessKeyId, secretAccessKey: config.account.secretAccessKey } });
const sts = new STSClient({ region: config.account.region });

let entriesToRemove = [];
let entriesToAdd = [];
let externalIp;
let pBar;

const main = async () => {
  try {
    console.log('\n=== AWS Security Group IP Updater ===\n');

    await getExternalIp();
    await checkMfa();
    await updateSecurityGroups();

    console.log('\nDone!\n');
  } catch (e) {
    console.log(`\nCaught error => ${e.message}\n`);
    console.log(`Full error => ${e}\n`);
  }
};

async function checkMfa() {
  if (!config.account.mfaSerial) return;

  const args = process.argv.slice(2);
  if (!args.length) return;

  const mfaToken = args[0];
  if (mfaToken.length !== 6) {
    throw new Error(`Invalid MFA token length (token = ${mfaToken}).`);
  }

  console.log('\nGetting STS session token');
  const params = {
    DurationSeconds: 900,
    SerialNumber: config.account.mfaSerial,
    TokenCode: mfaToken,
  };

  const command = new GetSessionTokenCommand(params);
  const data = await sts.send(command);
  console.log('Loading credentials from STS session token');
}

async function getExternalIp() {
  console.log('Getting external IP address.');
  const response = await fetch('http://api.ipify.org');
  const ip = await response.text();
  externalIp = `${ip}/32`;
  console.log(`External IP => ${externalIp}`);
}

async function updateSecurityGroups() {
  console.log(`\nGetting security groups for account "${config.account.name}".`);
  
  entriesToRemove = [];
  entriesToAdd = [];

  const command = new DescribeSecurityGroupsCommand({});
  let { SecurityGroups } = await ec2.send(command);

  //SecurityGroups = [SecurityGroups.find(x => x.GroupId === "sg-0115956a55042a1aa")];

  SecurityGroups.forEach(group => {
    console.log(` - Processing "${group.GroupName}"`);
    processSecurityGroup(group);
  });

  if (entriesToRemove.length) {
    pBar = new ProgressBar('    Revoking [:bar] :current/:total :: :rate/s :percent :etas', { total: entriesToRemove.length, width: 10 });
    await Promise.all(entriesToRemove.map(removeEntry));
  }

  if (entriesToAdd.length) {
    pBar = new ProgressBar(' Authorizing [:bar] :current/:total :: :rate/s :percent :etas', { total: entriesToAdd.length, width: 10 });
    await Promise.all(entriesToAdd.map(addEntry));
  }
}

function processSecurityGroup(group) {
    for (var j = 0; j < group.IpPermissions.length; j++) {	
        var permission = group.IpPermissions[j];	
        for (var k = 0; k < permission.IpRanges.length; k++) {	
            var ipRange = permission.IpRanges[k];	
            if (ipRange.Description && ipRange.Description.indexOf(config.descriptionString) !== -1 && ipRange.CidrIp !== externalIp) {	
                console.log('   - Found IP address to update (%s)', ipRange.CidrIp);	
                entriesToRemove.push({	
                    CidrIp: ipRange.CidrIp,	
                    DryRun: false,	
                    FromPort: permission.FromPort,	
                    ToPort: permission.ToPort,	
                    GroupId: group.GroupId,	
                    IpProtocol: permission.IpProtocol	
                });	
                entriesToAdd.push({	
                    DryRun: false,	
                    GroupId: group.GroupId,	
                    IpPermissions: [	
                        {	
                            FromPort: permission.FromPort,	
                            ToPort: permission.ToPort,	
                            IpProtocol: permission.IpProtocol,	
                            IpRanges: [{ CidrIp: externalIp, Description: ipRange.Description }]	
                        }	
                    ]	
                });	
            }	
        }	
    }
}

async function removeEntry(entry) {
  const command = new RevokeSecurityGroupIngressCommand(entry);
  await ec2.send(command);
  pBar.tick();
}

async function addEntry(entry) {
  const command = new AuthorizeSecurityGroupIngressCommand(entry);
  await ec2.send(command);
  pBar.tick();
}

main();