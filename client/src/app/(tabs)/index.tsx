import { View, Text, ScrollView, Image, Dimensions, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../../../components/Header'
import { BANNERS } from '@/assets/assets'
import { useFocusEffect, useRouter } from 'expo-router'
import { CATEGORIES } from '@/constants'
import CategoryItem from '../../../components/CategoryItem'
import { Product } from '@/constants/types'
import ProductItem from '../../../components/ProductItem'
import api from '@/constants/api'

const { width } = Dimensions.get('window')

export default function Home() {

    const router = useRouter()
    const [activeBannerIndex, setActiveBannerIndex] = useState(0)
    const [activeCategory, setActiveCategory] = useState('all')
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const categories = [{ id: 'all', name: 'All', icon: 'grid' }, ...CATEGORIES]

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products?limit=20');
            if (data.success && data.data && data.data.length > 0) {
                setProducts(data.data);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.warn('Failed to fetch products from API:', error);
            setProducts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchProducts();
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <Header title='Forever' showMenu showCart showLogo />

            <ScrollView
                className='flex-1 px-4'
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Banner slider */}
                <View className='mb-6'>
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                        className='w-full h-48 rounded-xl' scrollEventThrottle={16}
                        onScroll={(e) => {
                            const slide = Math.ceil(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width)
                            if (slide !== activeBannerIndex) {
                                setActiveBannerIndex(slide)
                            }
                        }}>
                        {BANNERS.map((banner, index) => (
                            <View key={index}
                                className='relative w-full h-48 bg-gray-200 overflow-hidden' style={{ width: width - 32 }} >
                                <Image source={{ uri: banner.image }}
                                    className='w-full h-full' resizeMode='cover' />
                                <View className='absolute inset-0 bg-black/40' />

                                <View className='absolute bottom-4 left-4 z-10'>
                                    <Text className='text-white text-2xl font-bold'>{banner.title}</Text>
                                    <Text className='text-white text-sm font-medium'>{banner.subtitle}</Text>
                                    <TouchableOpacity className='mt-2 bg-white px-4 py-2 rounded-full self-start'>
                                        <Text className='text-primary font-bold text-xs'>Get Now</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                    {/* Pagination dots */}
                    <View className='flex-row items-center justify-center mt-3 gap-2'>
                        {BANNERS.map((_, index) => (
                            <View key={index} className={`w-2 h-2 rounded-full ${index === activeBannerIndex ? 'w-6 bg-primary' : 'bg-gray-300'}`} />
                        ))}
                    </View>
                </View>

                {/* Catagories */}
                <View className='mb-6'>
                    <View className='flex-row justify-between items-center mb-4'>
                        <Text className='text-xl font-bold text-primary'>Categories</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} >
                        {categories.map((cat: any) => (
                            <CategoryItem key={cat.id} item={cat} isSelected={activeCategory === cat.id} onPress={() => router.push({ pathname: '/shop', params: { category: cat.id === 'all' ? '' : cat.name } })} />
                        ))}
                    </ScrollView>
                </View>

                {/* Popular products */}
                <View className='mb-8'>
                    <View className='flex-row justify-between items-center mb-4'>
                        <Text className='text-xl font-bold text-primary'>Popular Products</Text>
                        <TouchableOpacity onPress={() => router.push('/shop')}>
                            <Text className='text-secondary text-sm'>View All</Text>
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size='large' />
                    ) : (
                        <View className='flex-row flex-wrap justify-between'>
                            {products.slice(0, 8).map((product, index) => (
                                <ProductItem key={product._id ? `${product._id}-${index}` : String(index)} product={product} />
                            ))}
                        </View>
                    )}
                </View>

                {/* NewsLetter CTA  */}
                <View className='text-gray-100 p-6 rounded-2xl mb-20 items-center'>
                    <Text className='text-2xl font-bold text-primary mb-2 text-center'>
                        Join the Revolution
                    </Text>
                    <Text className='text-secondary text-center'>
                        Get 20% Off Your First Purchase and get 10% off on all future purchases
                    </Text>
                    <TouchableOpacity className='bg-primary w-4/5 py-3 mt-2 rounded-full items-center'>
                        <Text className='text-white font-medium'>
                            Suscribe Now
                        </Text>
                    </TouchableOpacity>
                </View>

            </ScrollView >
        </SafeAreaView>
    )
}