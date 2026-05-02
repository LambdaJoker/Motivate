import React, { useEffect, useState, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

let amapLoadPromise = null;

const loadAMap = (mapKey) => {
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }
  
  if (!amapLoadPromise) {
      // 屏蔽高德统计接口产生的跨域 Script error
      window.addEventListener('error', function(e) {
        if (e.message === 'Script error.' || (e.filename && e.filename.indexOf('amap.com') !== -1)) {
          e.preventDefault();
          e.stopPropagation();
          return true;
        }
      }, true);
  
      window._AMapSecurityConfig = {
        securityJsCode: process.env.REACT_APP_AMAP_SECURITY_CODE || '98b2c60ddc3c3d4b3bb1fabe33bc4aeb',
      };
    
    amapLoadPromise = AMapLoader.load({
        key: mapKey,
        version: '2.0',
        plugins: [
          'AMap.ToolBar',
          'AMap.Scale',
          'AMap.HawkEye',
          'AMap.MapType',
          'AMap.Geolocation' // 既然有了正确的 Key 和安全密钥，我们就可以放心地把 Geolocation 加回来了
        ],
      }).catch(err => {
      amapLoadPromise = null; // 失败后允许重试
      throw err;
    });
  }
  
  return amapLoadPromise;
};

// 高德地图组件，可以展示地图、标记点和路线
const AMap = ({ 
  center, 
  zoom = 10, 
  markers = [], 
  polyline = null, 
  autoFitView = true,
  style = { height: '500px', width: '100%' },
  mapKey = process.env.REACT_APP_AMAP_KEY || '3cd93fcc4e1ea99e8714949685d6caa5'
}) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [mapPolyline, setMapPolyline] = useState(null);
  
  // 地图首次加载完成的标记
  const [mapReady, setMapReady] = useState(false);

  // 初始化地图
  useEffect(() => {
    let map = null;
    let isUnmounted = false;

    const initMap = async () => {
      try {
        const AMap = await loadAMap(mapKey);
        
        if (isUnmounted || !mapRef.current) return;

        // 创建地图实例
        map = new AMap.Map(mapRef.current, {
          viewMode: '3D',
          zoom,
          // 如果没有传入中心点，或者经纬度无效，默认定位到北京，而不是让地图自动跑到美国（经纬度0,0或者未初始化的默认值）
          center: center && center.longitude != null && center.latitude != null && !isNaN(Number(center.longitude)) && !isNaN(Number(center.latitude))
            ? [Number(center.longitude), Number(center.latitude)] 
            : [116.397428, 39.90923],
          mapStyle: 'amap://styles/fresh', // 恢复主题样式
        });

        // 异步添加控件
        map.on('complete', () => {
          try {
            map.addControl(new AMap.ToolBar());
            map.addControl(new AMap.Scale());
          } catch (e) {
            console.warn('添加地图控件失败', e);
          }
          if (!isUnmounted) {
            setMapReady(true);
          }
        });

        setMapInstance(map);
      } catch (error) {
        console.error('地图初始化失败:', error);
      }
    };

    initMap();

    // 组件卸载时销毁地图实例
    return () => {
      isUnmounted = true;
      if (map && typeof map.destroy === 'function') {
        try {
          map.destroy();
        } catch(e) {}
      }
    };
  // 只依赖 mapKey，防止重复初始化
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey]); 

  // 更新地图中心点和缩放级别
  useEffect(() => {
    let isMounted = true;
    if (!mapInstance || mapInstance.CLASS_NAME !== 'AMap.Map' || !mapReady) return;
    
    if (center && center.longitude != null && center.latitude != null) {
      const lng = Number(center.longitude);
      const lat = Number(center.latitude);
      
      if (!isNaN(lng) && !isNaN(lat)) {
        // 使用 setTimeout 确保在画点逻辑之后执行，避免被 autoFitView 覆盖
        const timer = setTimeout(() => {
          if (!isMounted) return;
          try {
            mapInstance.setZoomAndCenter(zoom, [lng, lat], false, 600); // 增加动画时间参数，使缩放和平移更平滑
          } catch (error) {
            console.warn('更新地图中心点失败:', error);
          }
        }, 300);

        return () => {
          isMounted = false;
          clearTimeout(timer);
        };
      }
    }
  }, [mapInstance, center, zoom, mapReady]);

  // 更新地图标记点
  // 把 markers 中的核心数据提取出来作为依赖，避免对象引用变化导致无限重绘
  const markersDep = JSON.stringify(markers.map(m => ({ lng: m.longitude, lat: m.latitude, icon: m.icon })));
  useEffect(() => {
    // 增加一个标记确保不会在组件卸载后仍然更新状态
    let isMounted = true;
    
    // 这里加个延时，确保地图的 DOM 尺寸真正生成了再画点，解决 React 偶尔生命周期过快导致画点不显示
    const timer = setTimeout(() => {
      if (!isMounted || !mapInstance || mapInstance.CLASS_NAME !== 'AMap.Map') return;
      if (!markers || markers.length === 0) return;

      try {
        // 清除旧的标记点
        if (mapMarkers && mapMarkers.length > 0) {
          try {
            mapInstance.remove(mapMarkers);
            // 清除所有的覆盖物（防守型清理，以防有残留）
            mapInstance.clearMap(); 
          } catch(e) {}
        }

        // 过滤无效坐标
        const validMarkers = markers.filter(m => 
          m && m.longitude != null && m.latitude != null && 
          !isNaN(Number(m.longitude)) && !isNaN(Number(m.latitude))
        );

        if (validMarkers.length === 0) return;

        // 尝试从全局获取 AMap 对象，如果没有则直接返回
        const AMapObj = window.AMap;
        if (!AMapObj) return;

        // 添加新的标记点
        const newMarkers = validMarkers.map((markerData, index) => {
          // 这里确保提取坐标时强制转换为数字，防止出现字符串导致高德地图定位出错跑到美国
          const position = [Number(markerData.longitude), Number(markerData.latitude)];
          
          let markerOptions = {
            position: position,
            title: markerData.title || `标记点${index + 1}`,
            clickable: true,
            zIndex: markerData.isCustomIcon && markerData.icon.includes('32px') ? 100 : 10, // 选中的图标层级更高
          };

          // 判断是否是自定义 HTML 内容
          if (markerData.isCustomIcon) {
            markerOptions.content = markerData.icon;
            // 调整锚点到底部中心
            markerOptions.offset = new AMapObj.Pixel(-12, -24);
          } else {
            markerOptions.icon = markerData.icon || 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png';
          }

          const marker = new AMapObj.Marker(markerOptions);

          // 添加信息窗体
          if (markerData.infoWindow) {
            const infoWindow = new AMapObj.InfoWindow({
              content: markerData.infoWindow,
              offset: new AMapObj.Pixel(0, -30)
            });

            marker.on('click', () => {
              if (mapInstance && mapInstance.CLASS_NAME === 'AMap.Map') {
                infoWindow.open(mapInstance, marker.getPosition());
              }
            });
          }

          if (index === 0 && markerData.infoWindow) {
            // 延迟触发点击事件，确保标记已经被添加到地图上
            setTimeout(() => {
              if (isMounted) {
                marker.emit('click');
              }
            }, 300);
          }

          return marker;
        });

        // 统一添加到地图
        mapInstance.add(newMarkers);
        
        if (isMounted) {
          setMapMarkers(newMarkers);
        }

        // 调整视野，让所有标记点居中显示
        if (newMarkers.length > 0 && autoFitView) {
          // 给一个微小的延时让DOM绘制完毕再调整视野
          setTimeout(() => {
            if (isMounted && mapInstance && mapInstance.CLASS_NAME === 'AMap.Map') {
              mapInstance.setFitView(newMarkers, false, [50, 50, 50, 50]);
            }
          }, 100);
        }
      } catch (error) {
        console.warn('更新地图标记点失败:', error);
      }
    }, 150); // 增加一点延时

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, markersDep, autoFitView]);

  // 更新路线
  const polylineJson = polyline ? JSON.stringify(polyline) : null;
  useEffect(() => {
    let isMounted = true;
    
    const timer = setTimeout(() => {
      if (!isMounted || !mapInstance || mapInstance.CLASS_NAME !== 'AMap.Map' || !polyline) return;

      try {
        // 清除旧的路线
        if (mapPolyline) {
          try {
            mapInstance.remove(mapPolyline);
          } catch(e) {}
        }

        // 过滤无效路径坐标
        const validPath = polyline.path.filter(p => 
          p && p.length >= 2 && p[0] != null && p[1] != null && 
          !isNaN(Number(p[0])) && !isNaN(Number(p[1]))
        ).map(p => [Number(p[0]), Number(p[1])]);

        if (validPath.length < 2) return;

        const AMapObj = window.AMap;
        if (!AMapObj) return;

        // 添加新的路线
        const newPolyline = new AMapObj.Polyline({
          path: validPath,
          strokeColor: polyline.strokeColor || '#3366FF',
          strokeOpacity: polyline.strokeOpacity || 0.8,
          strokeWeight: polyline.strokeWeight || 6,
          strokeStyle: polyline.strokeStyle || 'solid',
          lineJoin: 'round',
          lineCap: 'round',
          showDir: true,
        });

        mapInstance.add(newPolyline);
        
        if (isMounted) {
          setMapPolyline(newPolyline);
        }
        
        // 调整视野包含整条路线
        setTimeout(() => {
          if (isMounted && mapInstance && mapInstance.CLASS_NAME === 'AMap.Map') {
            mapInstance.setFitView([newPolyline], false, [50, 50, 50, 50]);
          }
        }, 100);
      } catch (error) {
        console.warn('更新路线失败:', error);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, polylineJson]);

  return (
    <div ref={mapRef} style={style}></div>
  );
};

export default AMap; 