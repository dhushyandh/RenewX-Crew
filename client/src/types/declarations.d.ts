declare module 'react-native-razorpay' {
    const RazorpayCheckout: {
        open: (options: any) => Promise<any>;
        on: (event: string, callback: (...args: any[]) => void) => void;
        clear: () => void;
    };
    export default RazorpayCheckout;
}
