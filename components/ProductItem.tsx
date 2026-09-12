import React from 'react'
import { Product } from '@/constants/types'
import ProductCard from './ProductCard'

interface ProductItemProps {
    product: Product
}

export default function ProductItem({ product }: ProductItemProps) {
    return <ProductCard product={product} />
}

