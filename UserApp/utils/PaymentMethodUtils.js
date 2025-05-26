// Utility functions for payment method handling

export const getPaymentMethodIcon = (paymentMethod) => {
    if (!paymentMethod) {
        return require("../assets/icon/cash.png");
    }

    if (paymentMethod.type === 'cash') {
        return require("../assets/icon/cash.png");
    }

    // For card payments
    const cardType = paymentMethod.cardType;
    switch (cardType) {
        case 'Visa':
            return require("../assets/icon/visa.png");
        case 'Mastercard':
            return require("../assets/icon/mastercard.png");
        default:
            return require("../assets/icon/visa.png");
    }
};

export const getPaymentMethodDisplayText = (paymentMethod) => {
    if (!paymentMethod) {
        return "Cash";
    }

    if (paymentMethod.type === 'cash') {
        return "Cash";
    }

    // For card payments
    return paymentMethod.cardNumberMasked || paymentMethod.cardHolderName || paymentMethod.name || "Card";
};

export const getPaymentMethodDisplayInfo = (paymentMethod) => {
    return {
        icon: getPaymentMethodIcon(paymentMethod),
        text: getPaymentMethodDisplayText(paymentMethod)
    };
};

export const formatPaymentMethodForStorage = (paymentMethod) => {
    if (!paymentMethod) {
        return { type: 'cash', name: 'Cash' };
    }

    // Create a clean copy without sensitive data
    const cleanPaymentMethod = { ...paymentMethod };
    
    // Remove sensitive fields completely (don't set to undefined)
    delete cleanPaymentMethod.cardNumber;
    delete cleanPaymentMethod.cvv;
    delete cleanPaymentMethod.firstName;
    delete cleanPaymentMethod.lastName;
    
    return cleanPaymentMethod;
}; 