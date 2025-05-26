import { 
    collection, 
    doc, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    query, 
    where, 
    orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/init';

class PaymentMethodService {
    // Add a new payment method for a user
    static async addPaymentMethod(userId, paymentMethodData) {
        try {
            const paymentMethod = {
                userId,
                cardNumber: paymentMethodData.cardNumber,
                // Store only last 4 digits for security
                cardNumberMasked: `**** **** **** ${paymentMethodData.cardNumber.slice(-4)}`,
                expiryDate: paymentMethodData.expiryDate,
                cardHolderName: `${paymentMethodData.firstName} ${paymentMethodData.lastName}`,
                cardType: this.detectCardType(paymentMethodData.cardNumber),
                isDefault: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'paymentMethods'), paymentMethod);
            console.log('Payment method added with ID:', docRef.id);
            
            return {
                id: docRef.id,
                ...paymentMethod
            };
        } catch (error) {
            console.error('Error adding payment method:', error);
            throw error;
        }
    }

    // Get all payment methods for a user
    static async getUserPaymentMethods(userId) {
        try {
            // First try the simple query without orderBy to avoid index requirement
            const simpleQuery = query(
                collection(db, 'paymentMethods'),
                where('userId', '==', userId)
            );
            
            const querySnapshot = await getDocs(simpleQuery);
            const paymentMethods = [];
            
            querySnapshot.forEach((doc) => {
                paymentMethods.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Sort by createdAt in JavaScript instead of Firestore
            paymentMethods.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB - dateA; // Descending order (newest first)
            });
            
            return paymentMethods;
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            
            // If there's still an error, return empty array
            // This handles the case when the collection doesn't exist yet
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                console.log('No payment methods collection exists yet, returning empty array');
                return [];
            }
            
            throw error;
        }
    }

    // Delete a payment method
    static async deletePaymentMethod(paymentMethodId) {
        try {
            await deleteDoc(doc(db, 'paymentMethods', paymentMethodId));
            console.log('Payment method deleted:', paymentMethodId);
            return true;
        } catch (error) {
            console.error('Error deleting payment method:', error);
            throw error;
        }
    }

    // Detect card type based on card number
    static detectCardType(cardNumber) {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        
        if (cleanNumber.match(/^4/)) {
            return 'Visa';
        } else if (cleanNumber.match(/^5[1-5]/) || cleanNumber.match(/^2[2-7]/)) {
            return 'Mastercard';
        } else if (cleanNumber.match(/^3[47]/)) {
            return 'American Express';
        } else if (cleanNumber.match(/^6/)) {
            return 'Discover';
        }
        
        return 'Unknown';
    }

    // Format card number for display
    static formatCardNumber(cardNumber) {
        return cardNumber.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
    }

    // Validate card number using Luhn algorithm
    static validateCardNumber(cardNumber) {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        
        if (!/^\d+$/.test(cleanNumber)) {
            return false;
        }
        
        let sum = 0;
        let isEven = false;
        
        for (let i = cleanNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cleanNumber.charAt(i));
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }

    // Validate expiry date
    static validateExpiryDate(expiryDate) {
        const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (!regex.test(expiryDate)) {
            return false;
        }
        
        const [month, year] = expiryDate.split('/');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;
        
        const expYear = parseInt(year);
        const expMonth = parseInt(month);
        
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
            return false;
        }
        
        return true;
    }
}

export default PaymentMethodService; 