import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { HeaderProps } from '@/constants/types'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/constants'
import { useRouter } from 'expo-router'

export default function Header({ title, showBack, showSearch, showMenu, showLogo, showCart }: HeaderProps) {
    const router = useRouter()
    const { itemCount } = { itemCount: 6 }

    return (
        <View className="flex-row items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
            {/* Left side */}
            <View className="flex-row items-center justify-start min-w-[44px]">
                {showBack && (
                    <TouchableOpacity onPress={() => router.back()} className="p-1 -ml-1">
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
                {showMenu && (
                    <TouchableOpacity className="p-1 -ml-1">
                        <Ionicons name="menu-outline" size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Center: Logo or Title */}
            <View className="flex-1 items-center justify-center">
                {showLogo ? (
                    <Image
                        source={require('../assets/logo.png')}
                        style={{ width: 110, height: 28 }}
                        resizeMode="contain"
                    />
                ) : (
                    title && (
                        <Text className="text-lg font-bold text-primary text-center" numberOfLines={1}>
                            {title}
                        </Text>
                    )
                )}
            </View>

            {/* Right side */}
            <View className="flex-row items-center justify-end gap-3 min-w-[44px]">
                {showSearch && (
                    <TouchableOpacity className="p-1">
                        <Ionicons name="search-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
                {showCart && (
                    <TouchableOpacity onPress={() => router.push('/(tabs)/cart')} className="p-1 relative">
                        <Ionicons name="bag-outline" size={24} color={COLORS.primary} />
                        <View className="absolute -top-0.5 -right-0.5 bg-accent min-w-[16px] h-4 px-1 rounded-full items-center justify-center">
                            <Text className="text-white text-[10px] font-bold leading-none text-center">
                                {itemCount}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}