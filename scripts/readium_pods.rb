# Adds Readium transitive dependencies that require special CocoaPods options
# which cannot be expressed in a podspec's `s.dependency`.
#
# Call this inside your Podfile target block:
#
#   target 'MyApp' do
#     readium_pods
#     # ...
#   end
#
def readium_pods
  pod 'ReadiumGCDWebServer', :modular_headers => true
  pod 'Minizip', :modular_headers => true
end
