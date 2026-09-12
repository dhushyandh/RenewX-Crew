import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { CategoryItemProps } from '@/constants/types'
import { COLORS } from '@/constants'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function CategoryItem({ item, isSelected, onPress }: CategoryItemProps) {
    return (
        <TouchableOpacity className='mr-4 items-center' onPress={() => onPress?.(item)} activeOpacity={0.7}>
            <View className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${isSelected ? 'bg-primary' : 'bg-surface'}`}>
                <Ionicons name={item.icon as any} size={24} color={isSelected ? '#FFF' : COLORS.primary} />
            </View>
            <Text className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                {item.name}
            </Text>
        </TouchableOpacity>
    )
    
}