# Adds liblcp (R2LCPClient), EDRLab's private library, which this package can't depend on in
# its podspec: each app gets its own build from EDRLab, test or production. When it's linked,
# this package adapts and registers it itself.
#
# Call this inside your Podfile target block:
#
#   target 'MyApp' do
#     readium_pods
#     readium_lcp_pods
#     # ...
#   end
#
# The podspec URL comes from, in order:
#   1. the `podspec:` argument;
#   2. READIUM_LCP_IOS_PODSPEC in the environment;
#   3. READIUM_LCP_IOS_PODSPEC in the app's .env file, next to the ios/ folder.
#
# Without one, the app installs without liblcp and LCP reports itself unavailable at runtime.
#
# The URL is private to your app, so it's written to Podfile.lock (and Pods/Manifest.lock, which
# must match it) as READIUM_LCP_IOS_PODSPEC_REDACTED. CocoaPods then re-fetches the podspec on each
# install. Pass `redact_lockfile: false` to keep the URL in the lockfile instead.
#
# Returns the podspec URL, or nil.
def readium_lcp_pods(podspec: nil, redact_lockfile: true)
  podspec = [podspec, ENV['READIUM_LCP_IOS_PODSPEC'], readium_lcp_dotenv('READIUM_LCP_IOS_PODSPEC')]
    .map { |value| value.to_s.strip }
    .find { |value| !value.empty? }
  # Read by this package's podspec, which depends on R2LCPClient only when it's linked.
  $readium_lcp_podspec = podspec
  ReadiumLCPLockfileRedaction.url = redact_lockfile ? podspec : nil

  if podspec
    pod 'R2LCPClient', :podspec => podspec
  else
    Pod::UI.puts '[react-native-readium-lcp] No liblcp podspec configured; installing without liblcp.'.yellow
  end
  podspec
end

# A value from the app's .env file: KEY=value lines, with optional `export` and quotes.
def readium_lcp_dotenv(name)
  file = File.join(File.dirname(Pod::Config.instance.installation_root.to_s), '.env')
  return nil unless File.exist?(file)

  File.foreach(file) do |line|
    match = line.match(/^\s*(?:export\s+)?#{Regexp.escape(name)}\s*=\s*(.*?)\s*$/)
    return match[1].sub(/\A(['"])(.*)\1\z/, '\2') if match
  end
  nil
end

# Replaces the liblcp podspec URL in the lockfiles CocoaPods writes. Both Podfile.lock and
# Pods/Manifest.lock go through Lockfile#to_yaml, so they stay identical.
# The podspec loads this file on each evaluation, and tools may load it outside CocoaPods.
unless defined?(ReadiumLCPLockfileRedaction)
  module ReadiumLCPLockfileRedaction
    PLACEHOLDER = 'READIUM_LCP_IOS_PODSPEC_REDACTED'

    class << self
      attr_accessor :url
    end

    def to_yaml
      url = ReadiumLCPLockfileRedaction.url
      url ? super.gsub(url, PLACEHOLDER) : super
    end
  end

  Pod::Lockfile.prepend(ReadiumLCPLockfileRedaction) if defined?(Pod::Lockfile)
end
