const b_width = 1000
const d_width = 500
const b_height = 700
const d_height = 700
const colors = [
    '#DB202C', '#a6cee3', '#1f78b4',
    '#33a02c', '#fb9a99', '#b2df8a',
    '#fdbf6f', '#ff7f00', '#cab2d6',
    '#6a3d9a', '#ffff99', '#b15928']

// Part 1: Создать шкалы для цвета, радиуса и позиции 
const radius = d3.scaleLinear().range([.2, 10])
const color = d3.scaleOrdinal().range(colors)
const x = d3.scaleLinear().range([0, b_width])

const bubble = d3.select('.bubble-chart')
    .attr('width', b_width).attr('height', b_height)
const donut = d3.select('.donut-chart')
    .attr('width', d_width).attr('height', d_height)
    .append("g")
    .attr("transform", "translate(" + d_width / 2 + "," + d_height / 2 + ")")

const donut_lable = d3.select('.donut-chart').append('text')
    .attr('class', 'donut-lable')
    .attr("text-anchor", "middle")
    .attr('transform', `translate(${(d_width / 2)} ${d_height / 2})`)
const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", '#ffffff')


//  Part 1 - Создать симуляцию с использованием forceCenter(), forceX() и forceCollide()
const xParam = 'release year'
const rParam = 'user rating score'


let updateCx = d => x(d[xParam] ? d[xParam] : 0)
let updateR = d => radius(d[rParam] ? d[rParam] : 0)

const simulation = d3.forceSimulation()
    .force('x', d3.forceX().x(updateCx))
    .force('collision', d3.forceCollide().radius(updateR))
    .force("center", d3.forceCenter(b_width / 2, b_height / 2))


d3.csv('data/netflix.csv').then(data => {
    data = d3.nest().key(d => d.title).rollup(d => d[0]).entries(data).map(d => d.value).filter(d => d['user rating score'] !== 'NA')
    //console.log(data)

    const rating = data.map(d => +d['user rating score'])
    const years = data.map(d => +d['release year'])
    let ratings = d3.nest().key(d => d.rating).rollup(d => d.length).entries(data)

    // Part 1 - задать domain  для шкал цвета, радиуса и положения по x
    color.domain(ratings.map(d => d.key))
    radius.domain([d3.min(rating), d3.max(rating)])
    x.domain([d3.min(years), d3.max(years)])

    // Part 1 - создать circles на основе data + добавляем обработчики событий mouseover и mouseout
    let updateColor = d => color(d.rating)
    let addUpdate = obj => obj.attr('cx', updateCx).attr('r', updateR).attr('fill', updateColor)

    let nodes = addUpdate(bubble.selectAll("circle").data(data))

    addUpdate(nodes.enter().append("circle"))
        .on('mouseover', overBubble)
        .on('mouseout', outOfBubble)
    nodes.exit().remove()

    // Part 1 - передать данные в симуляцию и добавить обработчик события tick
    simulation.nodes(data).on("tick", tick)

    function tick() {
        let circles = d3.select('svg')
            .selectAll('circle')
            .data(data)

        circles.enter().append('circle')
            .attr('r', updateR)
            .style('fill', d => d.color)
            .merge(circles)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)

        circles.exit().remove()
    }

    // Part 1 - Создать шаблон при помощи d3.pie() на основе ratings
    let pie = d3.pie().value(d => d.count)
    let pieData = []
    data.forEach(d => pieData[d.rating] = {name: d.rating, count: 1})
    data.forEach(d => pieData[d.rating].count++)
    pieData = Object.values(pieData).sort((a, b) => a.count - b.count)

    // Part 1 - Создать генератор арок при помощи d3.arc() + Part 1 - построить donut chart внутри donut
    // + добавляем обработчики событий mouseover и mouseout
    donut.selectAll('path')
        .data(pie(pieData))
        .enter().append('path')
        .attr('d', d3.arc().innerRadius(100)
            .outerRadius(150)
            .padAngle(0.01)
            .cornerRadius(4))
        .attr('fill', d => color(d.data.name))
        .on('mouseover', overArc)
        .on('mouseout', outOfArc)


    function overBubble(d) {
        // Part 2 - задать stroke и stroke-width для выделяемого элемента
        this.setAttribute("stroke", "black")
        this.setAttribute("stroke-width", "1")

        // Part 3 - обновить содержимое tooltip с использованием классов title и year
        // + Part 3 - изменить display и позицию tooltip
        tooltip
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px")
            .text(d.title + ' ' + d['release year'])
            .style("visibility", "visible")
    }


    function outOfBubble() {
        // Part 2 - сбросить stroke и stroke-width
        this.removeAttribute("stroke")
        this.removeAttribute("stroke-width")

        // Part 3 - изменить display у tooltip
        tooltip.style("visibility", "hidden")
    }


    function overArc(d) {
        // Part 2 - изменить содержимое donut_lable
        donut_lable.text(d.data.name)

        // Part 2 - изменить opacity арки
        this.setAttribute("opacity", "0.5")

        // Part 3 - изменить opacity, stroke и stroke-width для circles в зависимости от rating
        d3.select('svg').selectAll('circle').each(function (e) {
            if (e.rating === d.data.name) {
                this.setAttribute("stroke", "black")
                this.setAttribute("stroke-width", "1")
            } else {
                this.setAttribute("opacity", "0.1")
            }
        })
    }

    function outOfArc(d) {
        // Part 2 - изменить содержимое donut_lable
        donut_lable.text('')

        // Part 2 - изменить opacity арки
        this.removeAttribute("opacity")

        // Part 3 - вернуть opacity, stroke и stroke-width для circles
        d3.select('svg').selectAll('circle').each(function () {
            this.removeAttribute("stroke")
            this.removeAttribute("stroke-width")
            this.removeAttribute("opacity")
        })
    }
})