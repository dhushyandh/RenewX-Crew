import express from 'express';
import { addAddress, deleteAddress, getAddresses, updateAddress } from '../controllers/addressController.js';
import { protect } from '../middlewares/auth.js';

const AddressRoutes = express.Router();

AddressRoutes.get('/', protect, getAddresses)

AddressRoutes.post('/', protect, addAddress)

AddressRoutes.put('/:id', protect, updateAddress)

AddressRoutes.delete('/:id', protect, deleteAddress)

export default AddressRoutes;