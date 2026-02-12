require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Load Nitrogen autolinking
nitrogen_autolinking = File.join(__dir__, "nitrogen/generated/ios/NitroReadium+autolinking.rb")
if File.exist?(nitrogen_autolinking)
  load nitrogen_autolinking
end

# Load Podfile helpers (defines readium_pods() and readium_post_install() for Podfile use)
load File.join(__dir__, "scripts/readium_pods.rb")
load File.join(__dir__, "scripts/readium_post_install.rb")

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

  # Adds React Native dependencies, framework header search paths, and
  # folly/compiler flags needed for use_frameworks!(:linkage => :static)
  install_modules_dependencies(s)

  # Add nitrogen generated files, NitroModules dependency, and C++20/interop config
  if defined?(add_nitrogen_files)
    add_nitrogen_files(s)
  end

end
