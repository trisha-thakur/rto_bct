// REST API server for RTO Blockchain Application
// This serves as the backend connecting client applications to the blockchain network

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// IPFS client for document storage
const ipfsClient = require('ipfs-http-client');
const ipfs = ipfsClient.create({ host: 'localhost', port: '5001', protocol: 'http' });

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Path to connection profile
const ccpPath = path.resolve(__dirname, '..', 'connection-profile.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

// Path to wallet directory
const walletPath = path.resolve(__dirname, '..', 'wallet');

// Helper function to connect to the network
async function connectToNetwork(orgName, userName) {
    try {
        // Create a new file system based wallet for managing identities
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // Check if user identity exists in the wallet
        const identity = await wallet.get(userName);
        if (!identity) {
            console.log(`User identity ${userName} does not exist in the wallet`);
            return {
                success: false,
                message: `User identity ${userName} does not exist in the wallet`
            };
        }
        
        // Create a new gateway for connecting to the peer node
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userName,
            discovery: { enabled: true, asLocalhost: true }
        });
        
        // Get the network (channel) our contract is deployed to
        const network = await gateway.getNetwork('rtochannel');
        
        // Get the contract from the network
        const contract = network.getContract('vehicleregistration');
        
        return {
            success: true,
            gateway,
            contract
        };
    } catch (error) {
        console.error(`Failed to connect to the network: ${error}`);
        return {
            success: false,
            message: error.message
        };
    }
}

// ===== API Routes =====

// Root endpoint - API health check
app.get('/', (req, res) => {
    res.json({ message: 'RTO Blockchain API is running' });
});

// Register a new vehicle
app.post('/api/vehicles/register', async (req, res) => {
    try {
        const {
            vehicleId, make, model, year, color, registrationNumber,
            chassisNumber, engineNumber, ownerName, ownerAadhar,
            insuranceStatus, insuranceExpiry, pollutionCertificate,
            pollutionExpiry, documentBuffer
        } = req.body;
        
        // Upload document to IPFS
        let documentIPFSHash = '';
        if (documentBuffer) {
            const buffer = Buffer.from(documentBuffer, 'base64');
            const result = await ipfs.add(buffer);
            documentIPFSHash = result.path;
        }
        
        // Connect to the network as an RTO official
        const networkObj = await connectToNetwork('RtoOrg', 'rtoAdmin');
        if (!networkObj.success) {
            return res.status(500).json({ error: networkObj.message });
        }
        
        // Invoke the smart contract
        const response = await networkObj.contract.submitTransaction(
            'registerVehicle',
            vehicleId, make, model, year, color, registrationNumber,
            chassisNumber, engineNumber, ownerName, ownerAadhar,
            insuranceStatus, insuranceExpiry, pollutionCertificate,
            pollutionExpiry, documentIPFSHash
        );
        
        // Disconnect from the gateway
        await networkObj.gateway.disconnect();
        
        const vehicle = JSON.parse(response.toString());
        res.status(201).json({
            success: true,
            message: 'Vehicle registered successfully',
            vehicle
        });
    } catch (error) {
        console.error(`Failed to register vehicle: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get vehicle details by ID
app.get('/api/vehicles/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        
        // Connect to the network
        const networkObj = await connectToNetwork('RtoOrg', 'rtoUser');
        if (!networkObj.success) {
            return res.status(500).json({ error: networkObj.message });
        }
        
        // Query the ledger
        const response = await networkObj.contract.evaluateTransaction('getVehicleDetails', vehicleId);
        
        // Disconnect from the gateway
        await networkObj.gateway.disconnect();
        
        const vehicle = JSON.parse(response.toString());
        res.json({
            success: true,
            vehicle
        });
    } catch (error) {
        console.error(`Failed to get vehicle details: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Query vehicle by registration number
app.get('/api/vehicles/registration/:registrationNumber', async (req, res) => {
    try {
        const { registrationNumber } = req.params;
        
        // Connect to the network
        const networkObj = await connectToNetwork('RtoOrg', 'rtoUser');
        if (!networkObj.success) {
            return res.status(500).json({ error: networkObj.message });
        }
        
        // Query the ledger using the registration index
        const response = await networkObj.contract.evaluateTransaction('queryByRegistrationNumber', registrationNumber);
        
        // Disconnect from the gateway
        await networkObj.gateway.disconnect();
        
        const vehicles = JSON.parse(response.toString());
        res.json({
            success: true,
            vehicles
        });
    } catch (error) {
        console.error(`Failed to query vehicle by registration: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Transfer vehicle ownership
app.post('/api/vehicles/:vehicleId/transfer', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { newOwnerName, newOwnerAadhar, transferDocumentBuffer } = req.body;
        
        // Upload transfer document to IPFS
        let transferDocumentIPFSHash = '';
        if (transferDocumentBuffer) {
            const buffer = Buffer.from(transferDocumentBuffer, 'base64');
            const result = await ipfs.add(buffer);
            transferDocumentIPFSHash = result.path;
        }
        
        // Connect to the network as an RTO official
        const networkObj = await connectToNetwork('RtoOrg', 'rtoAdmin');
        if (!networkObj.success) {
            return res.status(500).json({ error: networkObj.message });
        }
        
        // Invoke the smart contract
        const response = await networkObj.contract.submitTransaction(
            'transferOwnership',
            vehicleId,
            newOwnerName,
            newOwnerAadhar,
            transferDocumentIPFSHash
        );
        
        // Disconnect from the gateway
        await networkObj.gateway.disconnect();
        
        const vehicle = JSON.parse(response.toString());
        res.json({
            success: true,
            message: 'Vehicle ownership transferred successfully',
            vehicle
        });
    } catch (error) {
        console.error(`Failed to transfer ownership: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update vehicle information
app.put('/api/vehicles/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { 
            color, insuranceStatus, insuranceExpiry, 
            pollutionCertificate, pollutionExpiry, documentBuffer 
        } = req.body;
        
        // Upload new document to IPFS if provided
        let documentIPFSHash = '';
        if (documentBuffer) {
            const buffer = Buffer.from(documentBuffer, 'base64');
            const result = await ipfs.add(buffer);
            documentIPFSHash = result.path;
        }
        
        // Connect to the network as an RTO official
        const networkObj = await connectToNetwork('RtoOrg', 'rtoAdmin');
        if (!networkObj.success) {
            return res.status(500).json({ error: networkObj.message });
        }
        
        // Invoke the smart contract
        const response = await networkObj.contract.submitTransaction(
            'updateVehicleInfo',
            vehicleId,
            color || '',
            insuranceStatus || '',
            insuranceExpiry || '',
            pollutionCertificate || '',
            pollutionExpiry || '',
            documentIPFSHash
        );
        
        // Disconnect from the gateway
        await networkObj.gateway.disconnect();
        
        const vehicle = JSON.parse(response.toString());
        res.json({
            success: true,
            message: 'Vehicle information updated successfully',
            vehicle
        });
    } catch (error) {
        console.error(`Failed to update vehicle information: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get vehicle history
app.get('/api/vehicles/:vehicleId/history', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        
        // Connect to the network
        const networkObj = await connectToNetwork('RtoOrg', 'rtoUser');
        if (!networkObj.success) {
            return res.status(500).json({ error: networkObj.message });
        }
        
        // Query the ledger for history
        const response = await networkObj.contract.evaluateTransaction('getVehicleHistory', vehicleId);
        
        // Disconnect from the gateway
        await networkObj.gateway.disconnect();
        
        const history = JSON.parse(response.toString());
        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error(`Failed to get vehicle history: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get IPFS document
app.get('/api/documents/:ipfsHash', async (req, res) => {
    try {
        const { ipfsHash } = req.params;
        
        if (!ipfsHash) {
            return res.status(400).json({
                success: false,
                message: 'IPFS hash is required'
            });
        }
        
        // Fetch document from IPFS
        const chunks = [];
        for await (const chunk of ipfs.cat(ipfsHash)) {
            chunks.push(chunk);
        }
        
        const documentBuffer = Buffer.concat(chunks);
        
        res.json({
            success: true,
            document: documentBuffer.toString('base64')
        });
    } catch (error) {
        console.error(`Failed to fetch IPFS document: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Verify vehicle information
app.post('/api/vehicles/verify', async (req, res) => {
    try {
        const { vehicleId, chassisNumber, engineNumber } = req.body;
        
        // Connect to the network
        const networkObj = await connectToNetwork('RtoOrg', 'rtoUser');
        if (!networkObj.success) {
            return res.status(500).json({ error: networkObj.message });
        }
        
        // Invoke the smart contract
        const response = await networkObj.contract.evaluateTransaction(
            'verifyVehicleInformation',
            vehicleId,
            chassisNumber,
            engineNumber
        );
        
        // Disconnect from the gateway
        await networkObj.gateway.disconnect();
        
        const result = JSON.parse(response.toString());
        res.json({
            success: true,
            verified: result.verified,
            message: result.message
        });
    } catch (error) {
        console.error(`Failed to verify vehicle information: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`RTO Blockchain API server running on port ${PORT}`);
});

module.exports = app;