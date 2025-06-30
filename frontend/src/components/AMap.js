import React, { useEffect, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

// 高德地图组件，可以展示地图、标记点和路线
const AMap = ({ 
  center, 
  zoom = 12, 
  markers = [], 
  polyline = null, 
  style = { height: '500px', width: '100%' },
  mapKey // 高德地图API密钥
}) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [mapPolyline, setMapPolyline] = useState(null);

  // 初始化地图
  useEffect(() => {
    let map;
    let loadingPromise;

    const initMap = async () => {
      try {
        if (!window.AMap) {
          loadingPromise = AMapLoader.load({
            key: mapKey,
            version: '2.0',
            plugins: [
              'AMap.ToolBar',
              'AMap.Scale',
              'AMap.HawkEye',
              'AMap.MapType',
              'AMap.Geolocation',
              'AMap.Weather',
            ],
          });
          await loadingPromise;
        }

        // 创建地图实例
        map = new window.AMap.Map('map-container', {
          viewMode: '3D',
          zoom,
          center: center ? [center.longitude, center.latitude] : [116.397428, 39.90923],
          mapStyle: 'amap://styles/fresh',
        });

        // 添加控件
        map.addControl(new window.AMap.ToolBar());
        map.addControl(new window.AMap.Scale());

        setMapInstance(map);
      } catch (error) {
        console.error('地图初始化失败:', error);
      }
    };

    initMap();

    // 组件卸载时销毁地图实例
    return () => {
      if (map) {
        map.destroy();
      }
    };
  }, [mapKey]);

  // 更新地图中心点和缩放级别
  useEffect(() => {
    if (mapInstance && center) {
      mapInstance.setCenter([center.longitude, center.latitude]);
      mapInstance.setZoom(zoom);
    }
  }, [mapInstance, center, zoom]);

  // 更新地图标记点
  useEffect(() => {
    if (!mapInstance || !markers.length) return;

    // 清除旧的标记点
    if (mapMarkers.length) {
      mapMarkers.forEach(marker => {
        marker.remove();
      });
    }

    // 添加新的标记点
    const newMarkers = markers.map((markerData, index) => {
      const marker = new window.AMap.Marker({
        position: [markerData.longitude, markerData.latitude],
        title: markerData.title || `标记点${index + 1}`,
        icon: markerData.icon || 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
        clickable: true,
      });

      // 如果有信息窗体内容，则添加
      if (markerData.infoWindow) {
        const infoWindow = new window.AMap.InfoWindow({
          content: markerData.infoWindow,
          offset: new window.AMap.Pixel(0, -30)
        });

        // 点击标记时打开信息窗体
        marker.on('click', () => {
          infoWindow.open(mapInstance, marker.getPosition());
        });
      }

      // 如果是第一个标记点，默认打开信息窗口
      if (index === 0 && markerData.infoWindow) {
        marker.emit('click');
      }

      // 添加标记点到地图
      marker.setMap(mapInstance);
      return marker;
    });

    setMapMarkers(newMarkers);

    // 如果有多个标记点，自动调整地图视野以包含所有标记点
    if (newMarkers.length > 1) {
      mapInstance.setFitView(newMarkers);
    }
  }, [mapInstance, markers]);

  // 更新路线
  useEffect(() => {
    if (!mapInstance || !polyline) return;

    // 清除旧的路线
    if (mapPolyline) {
      mapPolyline.remove();
    }

    // 添加新的路线
    const newPolyline = new window.AMap.Polyline({
      path: polyline.path,
      strokeColor: polyline.strokeColor || '#3366FF',
      strokeOpacity: polyline.strokeOpacity || 0.8,
      strokeWeight: polyline.strokeWeight || 6,
      strokeStyle: polyline.strokeStyle || 'solid',
      lineJoin: 'round',
      lineCap: 'round',
      showDir: true,
    });

    newPolyline.setMap(mapInstance);
    setMapPolyline(newPolyline);

    // 自动调整地图视野以包含整条路线
    mapInstance.setFitView([newPolyline]);
  }, [mapInstance, polyline]);

  return (
    <div id="map-container" style={style}></div>
  );
};

export default AMap; 