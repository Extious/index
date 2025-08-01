(function () {
  var canvasEl = document.getElementById('canvas');
  var ctx = canvasEl.getContext('2d');
  var mousePos = [0, 0];

  var easingFactor = 5.0;
  var backgroundColor = '#000';
  var nodeColor = '#fff';
  var edgeColor = '#fff';

  var nodes = [];
  var edges = [];

  function constructNodes() {
    for (var i = 0; i < 100; i++) {
      var node = {
        drivenByMouse: i == 0,
        x: Math.random() * canvasEl.width,
        y: Math.random() * canvasEl.height,
        vx: Math.random() * 1 - 0.5,
        vy: Math.random() * 1 - 0.5,
        radius: Math.random() > 0.9 ? 3 + Math.random() * 3 : 1 + Math.random() * 3
      };

      nodes.push(node);
    }

    nodes.forEach(function (e) {
      nodes.forEach(function (e2) {
        if (e == e2) {
          return;
        }

        var edge = {
          from: e,
          to: e2
        }

        addEdge(edge);
      });
    });
  }

  function addEdge(edge) {
    var ignore = false;

    edges.forEach(function (e) {
      if (e.from == edge.from && e.to == edge.to) {
        ignore = true;
      }

      if (e.to == edge.from && e.from == edge.to) {
        ignore = true;
      }
    });

    if (!ignore) {
      edges.push(edge);
    }
  }

  function step() {
    nodes.forEach(function (e) {
      if (e.drivenByMouse) {
        return;
      }

      e.x += e.vx;
      e.y += e.vy;

      function clamp(min, max, value) {
        if (value > max) {
          return max;
        } else if (value < min) {
          return min;
        } else {
          return value;
        }
      }

      if (e.x <= 0 || e.x >= canvasEl.width) {
        e.vx *= -1;
        e.x = clamp(0, canvasEl.width, e.x)
      }

      if (e.y <= 0 || e.y >= canvasEl.height) {
        e.vy *= -1;
        e.y = clamp(0, canvasEl.height, e.y)
      }
    });

    adjustNodeDrivenByMouse();
    render();
    window.requestAnimationFrame(step);
  }

  function adjustNodeDrivenByMouse() {
    nodes[0].x += (mousePos[0] - nodes[0].x) / easingFactor;
    nodes[0].y += (mousePos[1] - nodes[0].y) / easingFactor;
  }

  function lengthOfEdge(edge) {
    return Math.sqrt(Math.pow((edge.from.x - edge.to.x), 2) + Math.pow((edge.from.y - edge.to.y), 2));
  }

  function render() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

    edges.forEach(function (e) {
      var l = lengthOfEdge(e);
      var threshold = canvasEl.width / 8;

      if (l > threshold) {
        return;
      }

      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = (1.0 - l / threshold) * 2.5;
      ctx.globalAlpha = 1.0 - l / threshold;
      ctx.beginPath();
      ctx.moveTo(e.from.x, e.from.y);
      ctx.lineTo(e.to.x, e.to.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    nodes.forEach(function (e) {
      if (e.drivenByMouse) {
        return;
      }

      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  window.onresize = function () {
    canvasEl.width = document.body.clientWidth;
    canvasEl.height = window.innerHeight; // 使用innerHeight而不是clientHeight

    if (nodes.length == 0) {
      constructNodes();
    } else {
      // 调整现有节点位置确保在视图内
      nodes.forEach(function(node) {
        if (node.x > canvasEl.width) node.x = canvasEl.width * Math.random();
        if (node.y > canvasEl.height) node.y = canvasEl.height * Math.random();
      });
    }

    render();
  };

  window.onmousemove = function (e) {
    // 检查鼠标是否在图谱或按钮容器上
    // 修改鼠标检测，统一整个区域的交互
    const container = document.querySelector('.buttons-container');
    const graphContainer = document.getElementById('graph-container');
    const isOverContent = 
      e.target.closest('.buttons-container') || 
      e.target.closest('#graph-container') || 
      e.target.closest('.graph-controls');
    
    // 如果不在内容区域上，更新粒子位置
    if (!isOverContent) {
      mousePos[0] = e.clientX;
      mousePos[1] = e.clientY;
    }
  }

  window.onresize(); // trigger the event manually.
  window.requestAnimationFrame(step);

  // 平滑滚动效果
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });

  // 监听滚动事件 - 调整为透明效果
  window.addEventListener('scroll', function() {
    const scrollY = window.scrollY;
    const graphContainer = document.getElementById('graph-container');
    const viewportHeight = window.innerHeight;
    
    // 不再调整粒子背景的不透明度，保持完全可见
    canvasEl.style.opacity = '1';

    // 添加视差效果 - 减少移动幅度，避免露出背景
    if(graphContainer) {
      // 视差滚动效果 - 减小系数，让移动更加微妙
      const offset = scrollY * 0.03;
      // 只应用垂直方向的视差效果
      graphContainer.style.backgroundPosition = `center ${offset}px`;
    }
  });
  
  // 修复窗口大小调整时可能出现的背景问题
  window.addEventListener('resize', function() {
    // 确保canvas覆盖整个视口
    canvasEl.width = document.body.clientWidth;
    canvasEl.height = window.innerHeight;
    
    // 重新初始化粒子系统
    if (nodes.length > 0) {
      // 重新调整粒子位置
      nodes.forEach(function(node) {
        if (node.x > canvasEl.width) node.x = canvasEl.width * Math.random();
        if (node.y > canvasEl.height) node.y = canvasEl.height * Math.random();
      });
    }
    
    // 重绘场景
    render();
  });

  // ================= 知识图谱功能 =================
  // 全局配置
  const CONFIG = {
    animation: {
      nodePulse: 2500,
      transitionDuration: 300,
      colorTransition: 800
    },
    defaultView: {
      scale: 0.9,
      nodeRadius: 16,
      pulseRadius: 32
    }
  };

  // 加载知识图谱数据
  async function loadKnowledgeGraph() {
    try {
      // 使用fetch从JSON文件加载数据
      const response = await fetch('knowledge_graph.json');
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      const graphData = await response.json();
      
      // 初始化D3知识图谱
      initGraph(graphData);
    } catch (error) {
      console.error("无法加载知识图谱数据:", error);
      
      // 使用备用数据
      const backupData = {
        nodes: [
          { id: 1, name: "构建GoWeb服务器", description: "使用Go语言构建高性能Web服务器的相关知识", url: "https://zhaozhan.site" },
          { id: 2, name: "Go语言基础", description: "Go语言的基础语法和特性", url: "https://zhaozhan.site" },
          { id: 3, name: "Archlinux安装", description: "Archlinux系统安装与配置教程", url: "https://zhaozhan.site" },
          { id: 4, name: "Go语言进阶", description: "Go语言的高级特性与最佳实践", url: "https://zhaozhan.site" }
        ],
        links: [
          { source: 1, target: 2, strength: 1.2 },
          { source: 2, target: 4, strength: 0.8 },
          { source: 3, target: 4, strength: 1.0 }
        ],
        layout: {
          linkDistance: 180,
          charge: -350,
          collideRadius: 60,
          defaultColor: "rgba(120, 180, 255, 0.9)",
          hoverColor: "rgba(160, 220, 255, 0.95)"
        }
      };
      
      // 显示错误信息并使用备用数据
      document.getElementById('graph').innerHTML = 
        '<div class="error" style="color: white; padding: 20px; position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.2); border-radius: 5px; z-index: 100;">加载知识图谱数据失败，使用备用数据</div>';
      
      // 初始化知识图谱
      initGraph(backupData);
    }
  }

  /**
   * 初始化知识图谱
   * @param {Object} data - 知识图谱数据，包含nodes和links
   */
  function initGraph(data) {
    // 获取容器尺寸
    const container = document.getElementById('graph');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 创建SVG元素
    const svg = d3.select('#graph')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g');

    // 创建星空背景效果
    createStarryBackground(svg, width, height);

    // 创建力导向图
    const simulation = createForceSimulation(data, width, height);

    // 添加缩放功能
    const zoom = setupZoom(svg);
    d3.select('#graph svg').call(zoom);

    // 存储初始缩放变换
    let initialTransform = null;

    // 添加发光效果滤镜
    setupFilters(svg);

    // 绘制连接线
    const link = createLinks(svg, data);

    // 创建节点
    const node = createNodes(svg, data, simulation);

    // 设置节点拖拽和点击事件
    setupNodeInteractions(node, data, simulation);
    
    // 添加节点视觉元素
    addNodeVisuals(node, data);

    // 更新图形位置
    setupSimulationTick(simulation, link, node);

    // 设置按钮功能
    setupButtons(data, node, simulation);

    // 窗口调整大小时更新图形
    function resizeGraph() {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      d3.select('#graph svg')
        .attr('width', newWidth)
        .attr('height', newHeight);
          
      simulation
        .force('center', d3.forceCenter(newWidth / 2, newHeight / 2))
        .alpha(0.3)
        .restart();
          
      // 适配图形到新的视窗大小
      setTimeout(() => fitGraphToView(data, zoom, initialTransform), 300);
    }
    
    // 保存resizeHandler到全局对象
    window.graphResizeHandler = resizeGraph;
    
    // 适配图形到视窗
    function fitGraphToView() {
      // 获取节点边界
      const nodePositions = data.nodes.map(d => {
        return { x: d.x || 0, y: d.y || 0 };
      });

      if (nodePositions.length === 0) return;

      // 计算边界
      const xExtent = d3.extent(nodePositions, d => d.x);
      const yExtent = d3.extent(nodePositions, d => d.y);
      
      // 计算边界宽度和高度，并加上节点半径作为边距
      const nodeRadius = 70; // 考虑节点半径和文本标签
      const boundWidth = Math.max(xExtent[1] - xExtent[0], 400) + nodeRadius;
      const boundHeight = Math.max(yExtent[1] - yExtent[0], 300) + nodeRadius;
      
      // 计算缩放比例
      const xScale = width / boundWidth;
      const yScale = height / boundHeight;
      
      // 取较小的比例，确保图表完全可见
      const scale = Math.min(CONFIG.defaultView.scale, Math.min(xScale, yScale, 1.5));
      
      // 计算中心点
      const centerX = (xExtent[0] + xExtent[1]) / 2;
      const centerY = (yExtent[0] + yExtent[1]) / 2;
      
      // 创建新的缩放变换
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);
      
      // 保存为初始变换，用于重置
      initialTransform = transform;
      
      // 应用变换
      d3.select('#graph svg')
        .transition()
        .duration(750)
        .call(zoom.transform, transform);
    }
    
    // 初始调用一次以确保正确布局
    setTimeout(() => {
      resizeGraph();
      // 在初始布局后适配图形到视窗
      setTimeout(fitGraphToView, 500);
    }, 100);
  }

  /**
   * 创建星空背景 - 适应更透明的容器
   */
  function createStarryBackground(svg, width, height) {
    const starsGroup = svg.append('g').attr('class', 'stars-group');
    
    // 创建随机星星 - 减少数量，保持与背景粒子的协调性
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 0.8;
      const opacity = Math.random() * 0.3 + 0.1; // 更低的不透明度
      
      starsGroup.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', radius)
        .attr('fill', 'white')
        .attr('opacity', opacity)
        .attr('class', 'background-star')
        .style('filter', 'blur(0.3px)');
    }
  }

  /**
   * 创建力导向图模拟
   */
  function createForceSimulation(data, width, height) {
    return d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id).distance(data.layout?.linkDistance || 180))
      .force('charge', d3.forceManyBody().strength(data.layout?.charge || -350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(data.layout?.collideRadius || 60));
  }

  /**
   * 设置缩放功能
   */
  function setupZoom(svg) {
    return d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform);
      });
  }

  /**
   * 设置SVG过滤器
   */
  function setupFilters(svg) {
    const defs = svg.append('defs');
    
    // 节点发光效果
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
      
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
      
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    
    // 增强发光效果滤镜（用于鼠标悬停）
    const enhancedGlowFilter = defs.append('filter')
      .attr('id', 'enhancedGlow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
      
    enhancedGlowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '5')
      .attr('result', 'coloredBlur');
      
    const enhancedFeMerge = enhancedGlowFilter.append('feMerge');
    enhancedFeMerge.append('feMergeNode').attr('in', 'coloredBlur');
    enhancedFeMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    
    // 连接线发光效果
    const lineGlow = defs.append('filter')
      .attr('id', 'lineGlow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
      
    lineGlow.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'blur');
      
    const lineMerge = lineGlow.append('feMerge');
    lineMerge.append('feMergeNode').attr('in', 'blur');
    lineMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  /**
   * 创建连接线 - 调整为更适合透明背景的颜色和不透明度
   */
  function createLinks(svg, data) {
    return svg.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('class', 'link')
      .style('filter', 'url(#lineGlow)')
      .style('stroke', 'rgba(200, 230, 255, 0.5)') // 更亮的线条颜色，提高可见度
      .style('stroke-width', d => (d.strength ? d.strength * 1.5 : 1));
  }

  /**
   * 创建节点
   */
  function createNodes(svg, data, simulation) {
    return svg.append('g')
      .selectAll('.node')
      .data(data.nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .call(d3.drag()
        .on('start', (event, d) => dragstarted(event, d, simulation))
        .on('drag', (event, d) => dragged(event, d))
        .on('end', (event, d) => dragended(event, d, simulation)))
      .style('cursor', d => d.url ? 'pointer' : 'default'); // 有链接时显示手型光标
  }

  /**
   * 设置节点拖拽与点击事件
   */
  function setupNodeInteractions(node, data, simulation) {
    // 变量跟踪拖拽状态
    let isDragging = false;
    let dragStartTime = 0;
    
    // 单独添加点击事件处理器，确保只有在非拖拽时才触发
    node.on('click', function(event, d) {
      // 阻止事件冒泡
      event.preventDefault();
      event.stopPropagation();
      
      // 检查点击持续时间和拖拽状态
      const clickDuration = Date.now() - dragStartTime;
      
      // 仅在非拖拽状态且点击时长不超过300ms时跳转
      if (!isDragging && clickDuration < 300 && d.url) {
        // 使用window.open在新标签页打开链接
        window.open(d.url, '_blank');
      }
    });
    
    // 悬停效果
    node.on('mouseover', function(event, d) {
      handleNodeHover(this, d, data, node);
    })
    .on('mouseout', function() {
      handleNodeUnhover(data, node);
    });
    
    // 拖拽函数作用域
    window.dragstarted = function(event, d, simulation) {
      isDragging = false;
      dragStartTime = Date.now();
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    };

    window.dragged = function(event, d) {
      // 如果拖拽超过5px，标记为拖拽状态
      const dragDistance = Math.sqrt(Math.pow(event.x - d.x, 2) + Math.pow(event.y - d.y, 2));
      if (dragDistance > 5) {
        isDragging = true;
      }
      d.fx = event.x;
      d.fy = event.y;
    };

    window.dragended = function(event, d, simulation) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      
      // 一段时间后重置拖拽状态
      setTimeout(() => {
        isDragging = false;
      }, 300);
    };
  }

  /**
   * 添加节点视觉元素 - 调整为更适合透明背景的样式
   */
  function addNodeVisuals(node, data) {
    // 添加节点圆形 - 调整颜色和透明度，使节点在透明背景上更突出
    node.append('circle')
      .attr('class', 'node')
      .attr('r', CONFIG.defaultView.nodeRadius)
      .style('fill', d => data.layout?.defaultColor || 'rgba(180, 210, 255, 0.7)') // 更亮的蓝色
      .style('filter', 'url(#glow)');

    // 添加节点脉冲效果 - 调整颜色和透明度
    node.append('circle')
      .attr('r', CONFIG.defaultView.nodeRadius)
      .style('fill', 'none')
      .style('stroke', d => data.layout?.defaultColor || 'rgba(160, 200, 255, 0.5)') // 更淡的蓝色
      .style('stroke-width', 2)
      .style('stroke-opacity', 0.8)
      .style('filter', 'url(#glow)')
      .attr('class', 'pulse-circle')
      .attr('opacity', 0.5); // 降低不透明度
      
    // 添加脉冲动画
    d3.selectAll('.pulse-circle')
      .each(function() {
        const circle = d3.select(this);
        (function repeat() {
          circle
            .transition()
            .duration(CONFIG.animation.nodePulse)
            .attr('r', CONFIG.defaultView.pulseRadius)
            .style('stroke-opacity', 0)
            .transition()
            .duration(100)
            .attr('r', CONFIG.defaultView.nodeRadius)
            .style('stroke-opacity', 0.8)
            .on('end', repeat);
        })();
      });

    // 添加文本标签 - 强化文本阴影以提高透明背景下的可读性
    node.append('text')
      .attr('class', 'node-label')
      .attr('dy', 36)
      .style('font-size', '13px')
      .style('fill', 'white')
      .style('text-anchor', 'middle')
      .text(d => d.name)
      .style('text-shadow', '0 0 8px rgba(0, 0, 0, 0.95), 0 0 15px rgba(0, 0, 0, 0.8)'); // 增强文本阴影

    // 添加描述信息工具提示
    node.append('title')
      .text(d => {
        let tooltip = d.name;
        if (d.description) tooltip += '\n' + d.description;
        if (d.url) tooltip += '\n点击跳转到: ' + d.url;
        return tooltip;
      });

    // 添加链接标识（如果有URL）
    node.append('text')
      .attr('class', 'link-icon')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .style('font-family', "'Font Awesome 6 Free', 'FontAwesome'")
      .style('font-weight', 900)
      .style('font-size', '10px')
      .style('fill', 'white')
      .html(d => d.url ? '&#xf0c1;' : '')  // 使用HTML实体编码表示链接图标
      .style('opacity', 0.8);
  }

  /**
   * 处理节点悬停效果 - 调整高光颜色
   */
  function handleNodeHover(nodeElement, d, data, nodeSelection) {
    // 获取所有连接
    const link = d3.selectAll('.link');
    
    // 突出显示当前节点
    d3.select(nodeElement).select('.node')
      .transition()
      .duration(CONFIG.animation.transitionDuration)
      .attr('r', 20)
      .style('fill', data.layout?.hoverColor || 'rgba(200, 230, 255, 0.8)') // 更亮的蓝色
      .style('filter', 'url(#enhancedGlow)');
      
    d3.select(nodeElement).select('.pulse-circle')
      .transition()
      .duration(CONFIG.animation.transitionDuration)
      .style('stroke', data.layout?.hoverColor || 'rgba(160, 220, 255, 0.95)')
      .style('stroke-width', 3)
      .style('opacity', 0.8);
      
    d3.select(nodeElement).select('.node-label')
      .transition()
      .duration(CONFIG.animation.transitionDuration)
      .style('font-size', '14px')
      .style('font-weight', 'bold');
    
    d3.select(nodeElement).select('.link-icon')
      .transition()
      .duration(CONFIG.animation.transitionDuration)
      .style('opacity', 1)
      .style('font-size', '12px');
    
    // 找出与当前节点相关的链接和节点
    const relatedLinks = [];
    const relatedNodes = [d.id];
    
    link.each(function(l) {
      if (l.source.id === d.id || l.target.id === d.id) {
        relatedLinks.push(l);
        if (l.source.id === d.id) relatedNodes.push(l.target.id);
        if (l.target.id === d.id) relatedNodes.push(l.source.id);
      }
    });
    
    // 弱化不相关的节点和链接
    nodeSelection.each(function(n) {
      if (!relatedNodes.includes(n.id)) {
        d3.select(this).select('.node')
          .transition()
          .duration(CONFIG.animation.transitionDuration)
          .style('opacity', 0.3);
          
        d3.select(this).select('.pulse-circle')
          .transition()
          .duration(CONFIG.animation.transitionDuration)
          .style('opacity', 0.2);
          
        d3.select(this).select('.node-label')
          .transition()
          .duration(CONFIG.animation.transitionDuration)
          .style('opacity', 0.3);
          
        d3.select(this).select('.link-icon')
          .transition()
          .duration(CONFIG.animation.transitionDuration)
          .style('opacity', 0.3);
      }
    });
    
    link.each(function(l) {
      let isRelated = false;
      relatedLinks.forEach(rl => {
        if (rl === l) isRelated = true;
      });
      
      if (!isRelated) {
        d3.select(this)
          .transition()
          .duration(CONFIG.animation.transitionDuration)
          .style('opacity', 0.1);
      } else {
        d3.select(this)
          .transition()
          .duration(CONFIG.animation.transitionDuration)
          .style('opacity', 1)
          .style('stroke-width', l.strength ? l.strength * 3 : 2);
      }
    });
  }

  /**
   * 处理节点取消悬停效果
   */
  function handleNodeUnhover(data, nodeSelection) {
    // 获取所有连接
    const link = d3.selectAll('.link');
    
    // 恢复所有节点和链接的原始状态
    nodeSelection.selectAll('.node')
      .transition()
      .duration(CONFIG.animation.transitionDuration)
      .attr('r', CONFIG.defaultView.nodeRadius)
      .style('opacity', 1)
      .style('fill', data.layout?.defaultColor || 'rgba(120, 180, 255, 0.9)')
      .style('filter', 'url(#glow)');
      
    nodeSelection.selectAll('.pulse-circle')
      .transition()
      .duration(CONFIG.animation.transitionDuration)
      .style('stroke-width', 2)
      .style('stroke', data.layout?.defaultColor || 'rgba(120, 180, 255, 0.9)')
      .style('opacity', 0.6);
      
    nodeSelection.selectAll('.node-label')
      .transition()
      .duration(CONFIG.animation.transitionDuration)
      .style('font-size', '13px')
      .style('font-weight', 'normal')
      .style('opacity', 1);
      
    nodeSelection.selectAll('.link-icon')
      .transition()
      .duration(CONFIG.animation.transitionDuration)
      .style('opacity', 0.8)
      .style('font-size', '10px');
      
    link.transition()
      .duration(CONFIG.animation.transitionDuration)
      .style('opacity', 1)
      .style('stroke-width', d => (d.strength ? d.strength * 2 : 1.5));
  }

  /**
   * 设置模拟刷新事件
   */
  function setupSimulationTick(simulation, link, node) {
    simulation.on('tick', () => {
      // 更新连接位置
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      // 更新节点位置
      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
        
      // 添加模拟星空的动态效果
      d3.selectAll('.background-star')
        .attr('opacity', () => Math.random() * 0.5 + 0.2);
    });
  }

  /**
   * 设置按钮功能
   */
  function setupButtons(data, node, simulation) {
    // 自适应布局按钮
    document.getElementById('button1')?.addEventListener('click', function() {
      // 重置图形位置，使节点分布在窗口中间
      simulation.alpha(1).restart();
      
      // 设置一个计时器，等待模拟稳定一点后再适配视图
      setTimeout(() => {
        if (window.graphResizeHandler) {
          window.graphResizeHandler();
        }
      }, 700);
    });

    // 颜色切换按钮
    document.getElementById('button2')?.addEventListener('click', function() {
      // 更改节点颜色
      const colors = [
        'rgba(70, 140, 255, 0.9)',
        'rgba(120, 180, 255, 0.9)',
        'rgba(100, 150, 255, 0.9)',
        'rgba(140, 210, 255, 0.9)',
        'rgba(180, 140, 255, 0.9)',
        'rgba(255, 150, 140, 0.9)',
        'rgba(140, 255, 220, 0.9)'
      ];
      
      // 随机选择一个新颜色
      const newColor = colors[Math.floor(Math.random() * colors.length)];
      
      // 应用到所有节点
      node.selectAll('.node')
        .transition()
        .duration(CONFIG.animation.colorTransition)
        .style('fill', newColor);
        
      node.selectAll('.pulse-circle')
        .transition()
        .duration(CONFIG.animation.colorTransition)
        .style('stroke', newColor);
    });
  }

  // 添加窗口调整大小处理程序
  window.addEventListener('resize', debounce(function() {
    if (window.graphResizeHandler) {
      window.graphResizeHandler();
    }
  }, 250));

  /**
   * 工具函数：防抖
   */
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  }

  // 在DOM加载完成后初始化知识图谱
  document.addEventListener('DOMContentLoaded', function() {
    loadKnowledgeGraph();
  });

}).call(this);
