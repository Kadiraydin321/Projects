package com.omnibackup.transfer

import com.omnibackup.transfer.core.network.NetworkType
import com.omnibackup.transfer.core.network.NetworkUtils
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.NetworkInterface
import java.util.Collections

class NetworkUtilsTest {

    @Test
    fun testInterfacePriorityRanking() {
        // Hotspot önceliği en yüksek olmalı (100)
        assertEquals(100, NetworkUtils.getInterfacePriority("ap0"))
        assertEquals(100, NetworkUtils.getInterfacePriority("ap1"))
        assertEquals(100, NetworkUtils.getInterfacePriority("AP_DIRECT"))

        // Wi-Fi ikinci öncelikli (90)
        assertEquals(90, NetworkUtils.getInterfacePriority("wlan0"))
        assertEquals(90, NetworkUtils.getInterfacePriority("wlan1"))

        // Soft AP / swlan (80)
        assertEquals(80, NetworkUtils.getInterfacePriority("swlan0"))

        // USB Tethering (rndis) (70)
        assertEquals(70, NetworkUtils.getInterfacePriority("rndis0"))

        // Ethernet (60)
        assertEquals(60, NetworkUtils.getInterfacePriority("eth0"))
        assertEquals(60, NetworkUtils.getInterfacePriority("eth1"))

        // Diğer bilinmeyen veya hücresel arayüzler (0)
        assertEquals(0, NetworkUtils.getInterfacePriority("lo"))
        assertEquals(0, NetworkUtils.getInterfacePriority("rmnet0"))
        assertEquals(0, NetworkUtils.getInterfacePriority("tun0"))
        assertEquals(0, NetworkUtils.getInterfacePriority("dummy0"))
    }

    @Test
    fun testIsPrivateIpv4Validation() {
        // Geçerli 192.168.x.x blokları (Wi-Fi ve Hotspot)
        assertTrue(NetworkUtils.isPrivateIpv4("192.168.1.1"))
        assertTrue(NetworkUtils.isPrivateIpv4("192.168.43.1")) // Android Hotspot varsayılan IP
        assertTrue(NetworkUtils.isPrivateIpv4("192.168.49.1")) // Wi-Fi Direct varsayılan IP
        assertTrue(NetworkUtils.isPrivateIpv4("192.168.254.254"))

        // Geçerli 10.x.x.x blokları
        assertTrue(NetworkUtils.isPrivateIpv4("10.0.0.1"))
        assertTrue(NetworkUtils.isPrivateIpv4("10.123.45.67"))
        assertTrue(NetworkUtils.isPrivateIpv4("10.255.255.254"))

        // Geçerli 172.16.0.0 - 172.31.255.255 blokları
        assertTrue(NetworkUtils.isPrivateIpv4("172.16.0.1"))
        assertTrue(NetworkUtils.isPrivateIpv4("172.20.10.1"))
        assertTrue(NetworkUtils.isPrivateIpv4("172.31.255.254"))

        // Geçersiz veya Özel Olmayan Bloklar (Genel Internet)
        assertFalse(NetworkUtils.isPrivateIpv4("8.8.8.8"))
        assertFalse(NetworkUtils.isPrivateIpv4("1.1.1.1"))
        assertFalse(NetworkUtils.isPrivateIpv4("172.15.255.255")) // 172.16 altı
        assertFalse(NetworkUtils.isPrivateIpv4("172.32.0.1"))     // 172.31 üstü
        assertFalse(NetworkUtils.isPrivateIpv4("127.0.0.1"))      // Loopback
        assertFalse(NetworkUtils.isPrivateIpv4("169.254.1.1"))    // Link-local
    }

    @Test
    fun testRealNetworkInterfacesExecution() {
        // Mevcut JVM çalıştırma ortamındaki ağ arayüzlerini tara
        val ip = NetworkUtils.getLocalIpAddress()
        // Geliştirme makinesinde bir IP bulunabilir veya bulunmayabilir, ancak exception atmamalıdır
        if (ip != null) {
            assertTrue("Dönen IP özel yerel IP formatında olmalı", NetworkUtils.isPrivateIpv4(ip))
            assertFalse(ip.startsWith("127."))
        }
    }

    @Test
    fun testEmptyInterfaceList() {
        val result = NetworkUtils.getLocalIpAddress(emptyList())
        assertEquals(null, result)
    }
}
