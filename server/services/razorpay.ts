import axios from "axios";
import crypto from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

const getCredentials = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay credentials are not configured");
    return { keyId, keySecret };
};

const authConfig = () => {
    const { keyId, keySecret } = getCredentials();
    return {
        auth: { username: keyId, password: keySecret },
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
    };
};

export const getRazorpayKeyId = () => getCredentials().keyId;

export const createRazorpayOrder = async (params: {
    amount: number;
    receipt: string;
    notes?: Record<string, string>;
}) => {
    const response = await axios.post(`${RAZORPAY_API}/orders`, {
        amount: params.amount,
        currency: "INR",
        receipt: params.receipt.slice(0, 40),
        partial_payment: false,
        notes: params.notes,
    }, authConfig());
    return response.data;
};

export const fetchRazorpayOrder = async (orderId: string) => {
    const response = await axios.get(`${RAZORPAY_API}/orders/${encodeURIComponent(orderId)}`, authConfig());
    return response.data;
};

export const fetchRazorpayPayment = async (paymentId: string) => {
    const response = await axios.get(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}`, authConfig());
    return response.data;
};

export const refundRazorpayPayment = async (paymentId: string, amountInPaise: number) => {
    const response = await axios.post(
        `${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}/refund`,
        {
            amount: amountInPaise,
            speed: "optimum",
        },
        authConfig()
    );
    return response.data;
};

export const verifyRazorpayPaymentSignature = (orderId: string, paymentId: string, signature: string) => {
    const { keySecret } = getCredentials();
    const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const received = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return expectedBuffer.length === received.length && crypto.timingSafeEqual(expectedBuffer, received);
};

export const verifyRazorpayWebhookSignature = (rawBody: Buffer, signature: string) => {
    const { keySecret } = getCredentials();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || keySecret;
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const received = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return expectedBuffer.length === received.length && crypto.timingSafeEqual(expectedBuffer, received);
};
