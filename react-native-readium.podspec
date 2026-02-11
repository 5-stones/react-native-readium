require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Load Nitrogen autolinking
nitrogen_autolinking = File.join(__dir__, "nitrogen/generated/ios/NitroReadium+autolinking.rb")
if File.exist?(nitrogen_autolinking)
  load nitrogen_autolinking
end

Pod::Spec.new do |s|
  s.name         = "react-native-readium"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.ios.deployment_target = "15.1"

  s.source       = { :git => "http://github.com/5-stones/react-native-readium.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.public_header_files = ["ios/**/*.h"]

  s.swift_version = "5.0"
  s.module_name   = "NitroReadium"

  s.dependency 'ReadiumShared',   '~> 3.5.0'
  s.dependency 'ReadiumStreamer', '~> 3.5.0'
  s.dependency 'ReadiumNavigator','~> 3.5.0'
  s.dependency 'ReadiumAdapterGCDWebServer', '~> 3.5.0'
  s.dependency 'ReadiumInternal'
  s.dependency 'React-Fabric'
  s.dependency 'Yoga'

  # Add header search paths for React Fabric / Yoga internal headers
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"${PODS_ROOT}/Headers/Private/Yoga\" \"${PODS_ROOT}/Headers/Public/Yoga\""
  }

  # Add nitrogen generated files, NitroModules dependency, and C++20/interop config
  if defined?(add_nitrogen_files)
    add_nitrogen_files(s)
  end


end
