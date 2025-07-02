#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { createInterface } from 'readline';

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
const prompt = (question: string, defaultValue?: string): Promise<string> => {
  return new Promise((resolve) => {
    const defaultPrompt = defaultValue ? ` [${defaultValue}]` : '';
    rl.question(`${question}${defaultPrompt}: `, (answer) => {
      resolve(answer || defaultValue || '');
    });
  });
};

// Helper function to prompt for yes/no
const promptYesNo = async (question: string, defaultYes = false): Promise<boolean> => {
  const defaultPrompt = defaultYes ? '(Y/n)' : '(y/N)';
  const answer = await prompt(`${question} ${defaultPrompt}`);
  if (defaultYes) {
    return answer.toLowerCase() !== 'n';
  } else {
    return answer.toLowerCase() === 'y';
  }
};

// Helper function to hash a password
const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

// Helper function to get Bitbucket UUID
const getBitbucketUuid = async (username: string, token: string): Promise<string | null> => {
  try {
    const auth = 'Basic ' + btoa(`${username}:${token}`);
    console.log('Fetching your Bitbucket UUID...');
    
    const response = await fetch('https://api.bitbucket.org/2.0/user', {
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Error fetching UUID: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.uuid;
  } catch (error) {
    console.error('Error fetching UUID:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

// Main setup function
async function setup() {
  console.log('🔧 Setting up Bitbucket People Manager...\n');
  
  const envPath = join(process.cwd(), '.env');
  const envExamplePath = join(process.cwd(), '.env.example');
  
  // Check if .env already exists
  let existingEnv: Record<string, string> = {};
  let overwrite = false;
  
  if (existsSync(envPath)) {
    console.log('Existing .env file detected.');
    overwrite = await promptYesNo('Overwrite existing configuration?', false);
    
    if (!overwrite) {
      console.log('Setup cancelled. Existing configuration will be kept.');
      rl.close();
      return;
    }
    
    // Parse existing .env to get default values
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        existingEnv[match[1]] = match[2];
      }
    });
  }
  
  // Collect configuration
  const config: Record<string, string> = {};
  
  // Bitbucket credentials
  config.BITBUCKET_USER = await prompt("What's your Bitbucket username", existingEnv.BITBUCKET_USER);
  
  // For security, don't show the actual token as default
  const tokenPrompt = existingEnv.BITBUCKET_TOKEN ? 
    "What's your Bitbucket app password (leave empty to keep existing)" : 
    "What's your Bitbucket app password";
  
  const bitbucketToken = await prompt(tokenPrompt);
  config.BITBUCKET_TOKEN = bitbucketToken || existingEnv.BITBUCKET_TOKEN || '';
  
  // App credentials
  config.APP_USER = await prompt("What will be your app's username", existingEnv.APP_USER || 'admin');
  
  let appPassword = '';
  if (existingEnv.APP_PASS) {
    const keepOldPassword = await promptYesNo('Do you want to use your old password?', true);
    if (keepOldPassword) {
      appPassword = existingEnv.APP_PASS;
    }
  }
  
  if (!appPassword) {
    let passwordsMatch = false;
    while (!passwordsMatch) {
      const password1 = await prompt('Enter your new app password');
      const password2 = await prompt('Enter the same password again');
      
      if (password1 === password2) {
        passwordsMatch = true;
        appPassword = hashPassword(password1);
      } else {
        console.log("Passwords don't match. Please try again.");
      }
    }
  }
  
  config.APP_PASS = appPassword;
  
  // Port configuration
  config.PORT = await prompt('Port to run the application on', existingEnv.PORT || '3000');
  
  // Hide myself feature
  const hideMyself = await promptYesNo('Do you want to hide yourself from users?', true);
  config.HIDE_MYSELF = hideMyself ? 'true' : 'false';
  
  if (hideMyself) {
    console.log('\nFetching your Bitbucket UUID to enable the hide-myself feature...');
    const uuid = await getBitbucketUuid(config.BITBUCKET_USER, config.BITBUCKET_TOKEN);
    
    if (uuid) {
      console.log(`✅ UUID found: ${uuid}`);
      config.HIDE_MYSELF_UUID = uuid;
    } else {
      console.log('❌ Could not fetch your UUID automatically.');
      config.HIDE_MYSELF_UUID = await prompt('Please enter your UUID manually (or leave empty to skip)');
    }
  } else {
    config.HIDE_MYSELF_UUID = '';
  }
  
  // Generate .env file content
  let envContent = '';
  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      envContent += `${key}=${value}\n`;
    }
  });
  
  // Write to .env file
  writeFileSync(envPath, envContent);
  console.log(`\n✅ Configuration saved to ${envPath}`);
  
  console.log('\n🚀 Setup complete! You can now run the application with:');
  console.log('bun dev');
  
  rl.close();
}

setup();
