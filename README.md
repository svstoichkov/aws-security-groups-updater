# AWS Security Group IP Updater

## Overview

The AWS Security Group IP Updater is a command-line utility written in Node.js for dynamically updating the IP addresses in your AWS Security Groups. This utility is particularly useful for developers who work in dynamic IP environments and need to frequently update their security groups to allow access to AWS resources.

## Features

- Automatically fetches your external IP address
- Updates specified AWS Security Groups to replace old IP with the current one
- Supports multi-factor authentication (MFA) for enhanced security
- Provides a progress bar to indicate the status of the updates
- Logs details for auditing and troubleshooting

## Requirements

- Node.js v14.x or higher

## Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-username/aws-security-group-ip-updater.git
   ```

2. **Navigate to the Project Directory**

   ```bash
   cd aws-security-group-ip-updater/src
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Configuration**

   - Rename the `config.json.dist` file to `config.json`.
   - Fill in your AWS account details and Security Group IDs that you want to update in `config.json`.

## Usage

1. **Basic Usage**

   ```bash
   node index.mjs
   ```

2. **With MFA Token**

   ```bash
   node index.mjs 123456
   ```

   Here, `123456` is your MFA token.

## Troubleshooting

- If you encounter any errors related to ES modules, make sure your Node.js version is v14.x or higher.

## Contributing

Feel free to open issues or submit pull requests. Your contributions are welcome!

## License

MIT License. See [LICENSE](LICENSE) for more information.
