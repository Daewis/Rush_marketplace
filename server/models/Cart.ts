import mongoose, { Schema, Document } from 'mongoose';

/**
 * Cart — a customer's shopping cart. One per user.
 *
 * Items can come from multiple vendors. On checkout, the cart is split
 * into one Order per vendor (see routes/cart.ts `POST /checkout`).
 */

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  vendorName?: string;
  productName: string;
  productImage?: string | null;
  unitPrice: number;
  quantity: number;
  addedAt: Date;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
    vendorName: { type: String, default: '' },
    productName: { type: String, required: true },
    productImage: { type: String, default: null },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

export const Cart = mongoose.model<ICart>('Cart', CartSchema);
