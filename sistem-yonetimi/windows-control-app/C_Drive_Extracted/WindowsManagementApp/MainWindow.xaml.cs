using System;
using System.Windows;
using System.Windows.Controls;
using System.Diagnostics;
using System.IO;
using System.Net.NetworkInformation;
using Microsoft.Win32;

namespace WindowsManagementApp
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            LoadSystemInfo();
        }

        private void LoadSystemInfo()
        {
            try
            {
                var info = new SystemInfo();
                txtCPU.Text = info.CPUModel;
                txtRAM.Text = $"{info.TotalMemory} MB";
                txtOS.Text = info.OSVersion;
                txtDisk.Text = $"{info.TotalDiskSpace} GB";
                txtNetwork.Text = GetNetworkStatus();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading system info: {ex.Message}");
            }
        }

        private string GetNetworkStatus()
        {
            try
            {
                var networkInterface = NetworkInterface.GetAllNetworkInterfaces()[0];
                return networkInterface.OperationalStatus.ToString();
            }
            catch
            {
                return "Unknown";
            }
        }

        private void btnTestSpeed_Click(object sender, RoutedEventArgs e)
        {
            // Network speed test implementation will go here
            MessageBox.Show("Network speed test would be implemented here.");
        }

        private void btnRegistry_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced");
                if (key != null)
                {
                    var value = key.GetValue("ShowSyncProviderNotifications", "0").ToString();
                    MessageBox.Show($"ShowSyncProviderNotifications: {value}");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Registry error: {ex.Message}");
            }
        }

        private void btnBrightness_Click(object sender, RoutedEventArgs e)
        {
            // Brightness control implementation will go here
            MessageBox.Show("Brightness control would be implemented here.");
        }

        private void btnVolume_Click(object sender, RoutedEventArgs e)
        {
            // Volume control implementation will go here
            MessageBox.Show("Volume control would be implemented here.");
        }
    }

    public class SystemInfo
    {
        public string CPUModel { get; set; }
        public int TotalMemory { get; set; }
        public string OSVersion { get; set; }
        public int TotalDiskSpace { get; set; }

        public SystemInfo()
        {
            CPUModel = GetCPUModel();
            TotalMemory = GetTotalMemory();
            OSVersion = GetOSVersion();
            TotalDiskSpace = GetTotalDiskSpace();
        }

        private string GetCPUModel()
        {
            return Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER") ?? "Unknown";
        }

        private int GetTotalMemory()
        {
            var info = new PerformanceCounter("Memory", "Available MBytes");
            return (int)info.NextValue();
        }

        private string GetOSVersion()
        {
            return Environment.OSVersion.VersionString;
        }

        private int GetTotalDiskSpace()
        {
            var drive = DriveInfo.GetDrives()[0];
            return (int)(drive.TotalSize / (1024 * 1024 * 1024));
        }
    }
}