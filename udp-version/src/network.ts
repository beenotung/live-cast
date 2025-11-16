import os from 'os'

export let broadcastAddress = findAddress()

console.log({ broadcastAddress })

function findAddress() {
  let addresses = Object.values(os.networkInterfaces())
    .flatMap(iface => iface)
    .map(iface => {
      if (!iface) return
      // | address       | netmask       | broadcast      |
      // |---------------|---------------|----------------|
      // | 192.168.1.100 | 255.255.255.0 | 192.168.1.255  |
      // | 172. 16.9.252 | 255.240.0.0   | 172.31.255.255 |
      // | 10.0.0.1      | 255.0.0.0     | 10.255.255.255 |
      let address: (string | number)[] = iface.address.split('.')
      let netmask: (string | number)[] = iface.netmask.split('.')

      if (address.length != 4 || netmask.length != 4) return
      for (let i = 0; i < address.length; i++) {
        address[i] = +address[i] | (255 ^ +netmask[i])
      }
      let broadcastAddress = address.join('.')
      return broadcastAddress
    })
    .filter(address => address)
    .map(address => address!)
  let broadcastAddress = addresses.find(address => isPrivateIPv4(address))
  if (!broadcastAddress) {
    throw new Error('failed to resolve broadcast address')
  }
  return broadcastAddress
}

// 192.168.0.0/16
// 172.16.0.0/12
// 10.0.0.0/8
function isPrivateIPv4(ip: string) {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  )
}
