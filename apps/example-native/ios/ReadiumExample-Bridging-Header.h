//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//

#import <Foundation/Foundation.h>

// react-native-readium-lcp's entry point for the app's liblcp adapter. Declared here because
// the pod's Swift module can't be imported from the app: its Nitro headers are C++.
@interface RNRLCPClientRegistry : NSObject
+ (BOOL)registerClient:(id)client;
@end
