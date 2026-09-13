import * as Location from "expo-location";

export type DetectedLocation = {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
    pincode: string;
    street: string;
};

export async function getCurrentLocation(): Promise<DetectedLocation> {
    const { status } =
        await Location.requestForegroundPermissionsAsync();

    if (status !== Location.PermissionStatus.GRANTED) {
        throw new Error(
            "Location permission was denied. Please allow location access and try again."
        );
    }

    const location =
        await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

    const { latitude, longitude } =
        location.coords;

    const addresses =
        await Location.reverseGeocodeAsync({
            latitude,
            longitude,
        });

    const address = addresses[0];

    if (!address) {
        throw new Error(
            "We couldn't determine your address from the current location."
        );
    }

    return {
        latitude,
        longitude,
        city:
            address.city ||
            address.district ||
            address.subregion ||
            "",
        state:
            address.region ||
            "",
        country:
            address.country ||
            "India",
        pincode:
            address.postalCode ||
            "",
        street:
            [
                address.name,
                address.street,
            ]
                .filter(Boolean)
                .join(", "),
    };
}