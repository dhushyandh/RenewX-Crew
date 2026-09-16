import Address from "../models/Address.js";
import { Request, Response } from "express";


// Get user Addresses -> GET /api/address

export const getAddresses = async (req: Request, res: Response) => {
    try {
        const addresses = await Address.find({ user: req.user._id }).sort('-createdAt')
        if (!addresses) {
            return res.status(404).json({
                success: false,
                message: 'No addresses found'
            })
        }
        return res.status(200).json({
            success: true,
            data: addresses
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Add new address -> POST /api/address

export const addAddress = async (req: Request, res: Response) => {
    try {

        const { type, street, city, state, zipCode, country, isDefault } = req.body

        if (isDefault) {
            await Address.updateMany({ user: req.user._id }, { isDefault: false })
        }

        const newAddress = await Address.create({
            user: req.user._id,
            type,
            street,
            city,
            state,
            zipCode,
            country,
            isDefault: isDefault || false
        })
        return res.status(201).json({
            success: true,
            data: newAddress
        })

        if (!type || !street || !city || !state || !zipCode || !country) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            })
        }

        const address = await Address.create({
            user: req.user._id,
            ...req.body
        })
        return res.status(201).json({
            success: true,
            data: address
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Update Address -> PUT /api/address/:id
export const updateAddress = async (req: Request, res: Response) => {
    try {
        const { type, street, city, state, zipCode, country, isDefault } = req.body

        //Ensure user owns address
        const addressItem = await Address.findById(req.params.id)
        if (!addressItem) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            })
        }
        if (addressItem.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            })
        }

        if (isDefault) {
            await Address.updateMany({ user: req.user._id }, { isDefault: false })
        }

        const updatedAddress = await Address.findByIdAndUpdate(req.params.id, {
            type,
            street,
            city,
            state,
            zipCode,
            country,
            isDefault: isDefault || false
        }, { new: true })
        return res.status(200).json({
            success: true,
            data: updatedAddress
        })

        if (!type || !street || !city || !state || !zipCode || !country) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            })
        }

        const address = await Address.findByIdAndUpdate(req.params.id, req.body, { new: true })
        return res.status(200).json({
            success: true,
            data: address
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Delete Address -> DELETE /api/address/:id
export const deleteAddress = async (req: Request, res: Response) => {
    try {
        const address = await Address.findById(req.params.id)

        if(!address){
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            })
        }
        //Ensure user owns address
        if (address.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            })
        }
        await Address.deleteOne()
        return res.status(200).json({
            success: true,
            message: 'Address deleted successfully'
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}