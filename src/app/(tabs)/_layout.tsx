import React from 'react'
import { Tabs } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { View, Text } from 'react-native'
import {COLORS} from '@/constants'

export default function TabLayout() {
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
                        <Feather name={focused ? "shopping-cart" : "shopping-cart"} color={color} size={26} />
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