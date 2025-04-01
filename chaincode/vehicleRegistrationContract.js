// RTO Blockchain Implementation using Hyperledger Fabric
// This implementation focuses on vehicle registration smart contract

// ==== Smart Contract for Vehicle Registration ====


'use strict';

const { Contract } = require('fabric-contract-api');

class VehicleRegistration extends Contract {
    // Initialize the ledger
    async initLedger(ctx) {
        console.log('Initializing the vehicle registration ledger');
        
        // Sample initial vehicles - for demonstration purposes
        const vehicles = [
            {
                vehicleId: 'VEH1001',
                make: 'Toyota',
                model: 'Innova',
                year: '2023',
                color: 'White',
                registrationNumber: 'MH01AB1234',
                chassisNumber: 'MHYKZE81UFJ123456',
                engineNumber: 'ENJK28374H2FJ123',
                ownerName: 'Rahul Sharma',
                ownerAadhar: 'xxxx-xxxx-1234',
                registrationDate: '2023-10-15',
                insuranceStatus: 'Valid',
                insuranceExpiry: '2024-10-15',
                pollutionCertificate: 'Valid',
                pollutionExpiry: '2024-04-15',
                status: 'Active',
                documentIPFSHash: 'QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o'
            }
        ];

        for (const vehicle of vehicles) {
            await ctx.stub.putState(vehicle.vehicleId, Buffer.from(JSON.stringify(vehicle)));
            console.log(`Vehicle ${vehicle.vehicleId} initialized`);
            
            // Create an index for registration number
            await this.createRegistrationIndex(ctx, vehicle.vehicleId, vehicle.registrationNumber);
            
            // Create an index for chassis number
            await this.createChassisIndex(ctx, vehicle.vehicleId, vehicle.chassisNumber);
        }
    }
    
    // Create composite key index for registration number
    async createRegistrationIndex(ctx, vehicleId, registrationNumber) {
        const indexName = 'registration~vehicleId';
        const registrationIdIndexKey = ctx.stub.createCompositeKey(indexName, [registrationNumber, vehicleId]);
        await ctx.stub.putState(registrationIdIndexKey, Buffer.from('\u0000'));
    }
    
    // Create composite key index for chassis number
    async createChassisIndex(ctx, vehicleId, chassisNumber) {
        const indexName = 'chassis~vehicleId';
        const chassisIndexKey = ctx.stub.createCompositeKey(indexName, [chassisNumber, vehicleId]);
        await ctx.stub.putState(chassisIndexKey, Buffer.from('\u0000'));
    }

    // Register a new vehicle
    async registerVehicle(ctx, vehicleId, make, model, year, color, registrationNumber, 
                          chassisNumber, engineNumber, ownerName, ownerAadhar, 
                          insuranceStatus, insuranceExpiry, pollutionCertificate, 
                          pollutionExpiry, documentIPFSHash) {
        
        console.log(`Starting registration for vehicle ${vehicleId}`);
        
        // Check if vehicle with this ID already exists
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (exists) {
            throw new Error(`Vehicle with ID ${vehicleId} already exists`);
        }
        
        // Check if chassis number is already registered
        const chassisExists = await this.queryByChassisNumber(ctx, chassisNumber);
        if (chassisExists && chassisExists.length > 0) {
            throw new Error(`Vehicle with chassis number ${chassisNumber} already registered`);
        }
        
        // Validate insurance and pollution certificate
        if (insuranceStatus !== 'Valid') {
            throw new Error('Valid insurance is required for vehicle registration');
        }
        
        if (pollutionCertificate !== 'Valid') {
            throw new Error('Valid pollution certificate is required for vehicle registration');
        }
        
        // Get current date for registration
        const registrationDate = new Date().toISOString().split('T')[0];
        
        // Create vehicle asset
        const vehicle = {
            vehicleId,
            make,
            model,
            year,
            color,
            registrationNumber,
            chassisNumber,
            engineNumber,
            ownerName,
            ownerAadhar,
            registrationDate,
            insuranceStatus,
            insuranceExpiry,
            pollutionCertificate,
            pollutionExpiry,
            status: 'Active',
            documentIPFSHash
        };
        
        // Store vehicle on the ledger
        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        // Create indexes
        await this.createRegistrationIndex(ctx, vehicleId, registrationNumber);
        await this.createChassisIndex(ctx, vehicleId, chassisNumber);
        
        console.log(`Vehicle ${vehicleId} has been successfully registered`);
        return JSON.stringify(vehicle);
    }
    
    // Check if vehicle exists
    async vehicleExists(ctx, vehicleId) {
        const vehicleBuffer = await ctx.stub.getState(vehicleId);
        return vehicleBuffer && vehicleBuffer.length > 0;
    }
    
    // Get vehicle details
    async getVehicleDetails(ctx, vehicleId) {
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`Vehicle with ID ${vehicleId} does not exist`);
        }
        
        const vehicleBuffer = await ctx.stub.getState(vehicleId);
        const vehicle = JSON.parse(vehicleBuffer.toString());
        
        return JSON.stringify(vehicle);
    }
    
    // Query by registration number
    async queryByRegistrationNumber(ctx, registrationNumber) {
        return await this.queryByIndex(ctx, 'registration~vehicleId', registrationNumber);
    }
    
    // Query by chassis number
    async queryByChassisNumber(ctx, chassisNumber) {
        return await this.queryByIndex(ctx, 'chassis~vehicleId', chassisNumber);
    }
    
    // Query using index
    async queryByIndex(ctx, indexName, key) {
        const iterator = await ctx.stub.getStateByPartialCompositeKey(indexName, [key]);
        const results = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const compositeKey = result.value.key;
            const { attributes } = ctx.stub.splitCompositeKey(compositeKey);
            const vehicleId = attributes[1];
            
            const vehicleBuffer = await ctx.stub.getState(vehicleId);
            if (vehicleBuffer && vehicleBuffer.length > 0) {
                const vehicle = JSON.parse(vehicleBuffer.toString());
                results.push(vehicle);
            }
            
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(results);
    }
    
    // Transfer vehicle ownership
    async transferOwnership(ctx, vehicleId, newOwnerName, newOwnerAadhar, transferDocumentIPFSHash) {
        console.log(`Initiating ownership transfer for vehicle ${vehicleId}`);
        
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`Vehicle with ID ${vehicleId} does not exist`);
        }
        
        // Get current vehicle details
        const vehicleBuffer = await ctx.stub.getState(vehicleId);
        const vehicle = JSON.parse(vehicleBuffer.toString());
        
        // Update owner information
        vehicle.ownerName = newOwnerName;
        vehicle.ownerAadhar = newOwnerAadhar;
        vehicle.transferDocumentIPFSHash = transferDocumentIPFSHash;
        vehicle.transferDate = new Date().toISOString().split('T')[0];
        
        // Update the ledger
        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        console.log(`Ownership of vehicle ${vehicleId} transferred to ${newOwnerName}`);
        return JSON.stringify(vehicle);
    }
    
    // Update vehicle insurance status
    async updateInsurance(ctx, vehicleId, insuranceStatus, insuranceExpiry, insuranceDocumentIPFSHash) {
        console.log(`Updating insurance for vehicle ${vehicleId}`);
        
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`Vehicle with ID ${vehicleId} does not exist`);
        }
        
        // Get current vehicle details
        const vehicleBuffer = await ctx.stub.getState(vehicleId);
        const vehicle = JSON.parse(vehicleBuffer.toString());
        
        // Update insurance information
        vehicle.insuranceStatus = insuranceStatus;
        vehicle.insuranceExpiry = insuranceExpiry;
        vehicle.insuranceDocumentIPFSHash = insuranceDocumentIPFSHash;
        vehicle.insuranceUpdateDate = new Date().toISOString().split('T')[0];
        
        // Update the ledger
        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        console.log(`Insurance updated for vehicle ${vehicleId}`);
        return JSON.stringify(vehicle);
    }
    
    // Update pollution certificate
    async updatePollutionCertificate(ctx, vehicleId, pollutionStatus, pollutionExpiry, pollutionDocumentIPFSHash) {
        console.log(`Updating pollution certificate for vehicle ${vehicleId}`);
        
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`Vehicle with ID ${vehicleId} does not exist`);
        }
        
        // Get current vehicle details
        const vehicleBuffer = await ctx.stub.getState(vehicleId);
        const vehicle = JSON.parse(vehicleBuffer.toString());
        
        // Update pollution certificate information
        vehicle.pollutionCertificate = pollutionStatus;
        vehicle.pollutionExpiry = pollutionExpiry;
        vehicle.pollutionDocumentIPFSHash = pollutionDocumentIPFSHash;
        vehicle.pollutionUpdateDate = new Date().toISOString().split('T')[0];
        
        // Update the ledger
        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        console.log(`Pollution certificate updated for vehicle ${vehicleId}`);
        return JSON.stringify(vehicle);
    }
    
    // Get vehicle history
    async getVehicleHistory(ctx, vehicleId) {
        console.log(`Getting history for vehicle ${vehicleId}`);
        
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`Vehicle with ID ${vehicleId} does not exist`);
        }
        
        const iterator = await ctx.stub.getHistoryForKey(vehicleId);
        const results = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const modification = {};
            modification.txId = result.value.txId;
            modification.timestamp = new Date(result.value.timestamp.seconds.low * 1000).toISOString();
            
            if (result.value.isDelete) {
                modification.isDelete = true;
            } else {
                modification.isDelete = false;
                const vehicleJson = JSON.parse(result.value.value.toString('utf8'));
                modification.value = vehicleJson;
            }
            
            results.push(modification);
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(results);
    }
    
    // Report vehicle as stolen
    async reportStolen(ctx, vehicleId, reportingAuthority, caseNumber) {
        console.log(`Reporting vehicle ${vehicleId} as stolen`);
        
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`Vehicle with ID ${vehicleId} does not exist`);
        }
        
        // Get current vehicle details
        const vehicleBuffer = await ctx.stub.getState(vehicleId);
        const vehicle = JSON.parse(vehicleBuffer.toString());
        
        // Update vehicle status
        vehicle.status = 'Stolen';
        vehicle.stolenReportDate = new Date().toISOString().split('T')[0];
        vehicle.reportingAuthority = reportingAuthority;
        vehicle.caseNumber = caseNumber;
        
        // Update the ledger
        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        console.log(`Vehicle ${vehicleId} reported as stolen`);
        return JSON.stringify(vehicle);
    }
    
    // Recover stolen vehicle
    async recoverVehicle(ctx, vehicleId, recoveryAuthority, recoveryNotes) {
        console.log(`Recovering stolen vehicle ${vehicleId}`);
        
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`Vehicle with ID ${vehicleId} does not exist`);
        }
        
        // Get current vehicle details
        const vehicleBuffer = await ctx.stub.getState(vehicleId);
        const vehicle = JSON.parse(vehicleBuffer.toString());
        
        // Check if vehicle is marked as stolen
        if (vehicle.status !== 'Stolen') {
            throw new Error(`Vehicle ${vehicleId} is not marked as stolen`);
        }
        
        // Update vehicle status
        vehicle.status = 'Recovered';
        vehicle.recoveryDate = new Date().toISOString().split('T')[0];
        vehicle.recoveryAuthority = recoveryAuthority;
        vehicle.recoveryNotes = recoveryNotes;
        
        // Update the ledger
        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        console.log(`Vehicle ${vehicleId} recovered from stolen status`);
        return JSON.stringify(vehicle);
    }
    
    // Query all vehicles
    async queryAllVehicles(ctx) {
        const startKey = '';
        const endKey = '';
        
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const results = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const key = result.value.key;
            // Skip index keys
            if (!key.includes('~')) {
                const vehicleBuffer = result.value.value;
                if (vehicleBuffer && vehicleBuffer.length > 0) {
                    const vehicle = JSON.parse(vehicleBuffer.toString());
                    results.push(vehicle);
                }
            }
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(results);
    }
}

module.exports = VehicleRegistration;