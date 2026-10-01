require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Load Nitrogen autolinking
nitrogen_autolinking = File.join(__dir__, "nitrogen/generated/ios/NitroReadiumLCP+autolinking.rb")
if File.exist?(nitrogen_autolinking)
  load nitrogen_autolinking
end

Pod::Spec.new do |s|
  s.name         = "react-native-readium-lcp"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.ios.deployment_target = "15.1"

  s.source       = { :git => "http://github.com/5-stones/react-native-readium.git", :tag => "react-native-readium-lcp@#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.swift_version = "5.0"
  s.module_name   = "NitroReadiumLCP"

  # Must match the Readium version react-native-readium is built against.
  s.dependency 'ReadiumShared', '~> 3.11.0'
  s.dependency 'ReadiumLCP',    '~> 3.11.0'
  # Provides the content protection registry this pod registers into.
  s.dependency 'react-native-readium'

  install_modules_dependencies(s)

  if defined?(add_nitrogen_files)
    add_nitrogen_files(s)
  end
end
