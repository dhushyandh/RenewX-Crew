import React from 'react'
import { Tabs } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { View, Text } from 'react-native'
import { COLORS } from '@/constants'
import { useCart } from '../../../context/CartContext'

export default function TabLayout() {

    const { cartItems } = useCart()

    return (
        <Tabs
        screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: '#CDCDE0',
            tabBarShowLabel: false,
            tabBarStyle: {
                backgroundColor: '#fff',
                borderTopWidth: 1,
                borderTopColor: '#F0F0F0',
                paddingTop: 8,
                height: 56,
            },
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} color={color} size={26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Cart',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View>
                            <Ionicons name={focused ? "cart" : "cart-outline"} color={color} size={26} />
                            {cartItems.length > 0 && (
                                <View className='absolute -top-2 -right-2 bg-red-500 rounded-full w-4 h-4 items-center justify-center'>
                                    <Text className='text-white text-xs'>{cartItems.length}</Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="favorites"
                options={{
                    title: 'Favorites',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "heart" : "heart-outline"} color={color} size={26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "person" : "person-outline"} color={color} size={26} />
                    ),
                }}
            />
        </Tabs>
    )
}