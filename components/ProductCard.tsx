import { View, Text, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { ProductCardProps } from '@/constants/types'
import { Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/constants'

export default function ProductCard({ product }: ProductCardProps) {
    const [isLiked, setIsLiked] = useState(false)

    const discount = product.comparePrice && product.comparePrice > product.price
        ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
        : 0

    return (
        <Link href={{ pathname: '/product/[id]' as any, params: { id: product._id } }} asChild>
            <TouchableOpacity 
                activeOpacity={0.85} 
                className='w-[48%] mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'
            >
                {/* Product Image Container */}
                <View className='relative w-full h-48 bg-gray-50 items-center justify-center'>
                    {product.images && product.images.length > 0 ? (
                        <Image 
                            source={{ uri: product.images[0] }} 
                            className='w-full h-full' 
                            resizeMode='cover' 
                        />
                    ) : (
                        <Ionicons name='image-outline' size={40} color={COLORS.secondary} />
                    )}

                    {/* Badges Container */}
                    <View className='absolute top-2 left-2 flex-row gap-1'>
                        {product.isFeatured && (
                            <View className='bg-black px-2 py-1 rounded-md'>
                                <Text className='text-white font-bold text-[10px] uppercase tracking-wider'>Featured</Text>
                            </View>
                        )}
                        {discount > 0 && (
                            <View className='bg-red-500 px-2 py-1 rounded-md'>
                                <Text className='text-white font-bold text-[10px]'>-{discount}%</Text>
                            </View>
                        )}
                    </View>

                    {/* Favorite Icon */}
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        className='absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-sm items-center justify-center'
                        onPress={(e) => { 
                            e.stopPropagation();
                            setIsLiked(!isLiked);
                        }}
                    >
                        <Ionicons 
                            name={isLiked ? 'heart' : 'heart-outline'} 
                            size={18} 
                            color={isLiked ? COLORS.accent : COLORS.primary} 
                        />
                    </TouchableOpacity>
                </View>

                {/* Product Details */}
                <View className='p-3'>
                    {/* Ratings */}
                    {product.ratings && (
                        <View className='flex-row items-center gap-1 mb-1'>
                            <Ionicons name='star' size={13} color='#FBBF24' />
                            <Text className='text-primary font-semibold text-xs'>
                                {product.ratings.average?.toFixed(1) ?? '0.0'}
                            </Text>
                            <Text className='text-secondary text-xs'>
                                ({product.ratings.count ?? 0})
                            </Text>
                        </View>
                    )}

                    {/* Product Name */}
                    <Text className='text-primary font-semibold text-sm mb-1.5' numberOfLines={1}>
                        {product.name}
                    </Text>

                    {/* Price and Add Button */}
                    <View className='flex-row items-center justify-between mt-1'>
                        <View className='flex-row items-baseline gap-1.5'>
                            <Text className='text-primary font-bold text-base'>
                                ${product.price?.toFixed(2)}
                            </Text>
                            {product.comparePrice && product.comparePrice > product.price && (
                                <Text className='text-xs text-secondary line-through'>
                                    ${product.comparePrice.toFixed(2)}
                                </Text>
                            )}
                        </View>

                        <TouchableOpacity 
                            activeOpacity={0.7}
                            className='bg-black p-2 rounded-xl items-center justify-center'
                            onPress={(e) => {
                                e.stopPropagation();
                                // Handle add to cart
                            }}
                        >
                            <Ionicons name='add' size={18} color='white' />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    )
}