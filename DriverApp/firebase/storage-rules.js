/**
 * Firebase Storage Rules
 * 
 * The following rules should be added to your Firebase Storage rules
 * to enable driver license image uploads:
 * 
 * ```
 * rules_version = '2';
 * service firebase.storage {
 *   match /b/{bucket}/o {
 *     // Allow authenticated users to read/write their own license images
 *     match /driver_licenses/{userId}_{timestamp}.jpg {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth != null && 
 *                     request.auth.uid == userId.split('_')[0];
 *     }
 *     
 *     // Allow admins to read all images
 *     match /driver_licenses/{imageId} {
 *       allow read: if request.auth != null;
 *     }
 *   }
 * }
 * ```
 * 
 * Make sure to update your Firebase Storage rules in the Firebase Console:
 * 1. Go to Firebase Console
 * 2. Select your project
 * 3. Navigate to Storage
 * 4. Click on "Rules" tab
 * 5. Paste the above rules
 * 6. Click "Publish" to apply the rules
 */

// This file is for documentation purposes only 