loadData().then(({data, world}) => {
    console.log(data, world)
    const width = window.innerWidth
    const height = window.innerHeight
    const sliderHeight = 100

    const duration = 700// продолжительность анимации

    // переменные состояния с начальными значениями
    let year = '1900'
    let param = 'gdp'

    // основной svg-элемент, содержащий карту
    const svg = d3.select('body').append('svg').attr('width', width).attr('height', height)

    const colors = ['#d73027', '#1a9850'] // цвета градиента
    const noColor = '#CDCCCC' // для стран, по которым нет данных

    // Part 1: тут можно создать линейную цветовую шкалу на основе цветов
    const color = d3.scaleLinear().range(colors)

    // массив с годами
    const years = Object.keys(data[0][param]).map(d => +d).filter(d => d)

    // Part 2: тут можно создать шкалы х и y
    const x = d3.scaleBand(years, [0, width]).padding(.1),
        y = d3.scaleLinear().range([sliderHeight, 0])

    // Part 3: тут можно создать svg внутри #menu и добавить туда легенду
    const legend = d3.select('#menu').append('svg')
        .attr('width', 200).attr("height", 40)
    let gradient = legend.append('defs')
        .append("svg:linearGradient")
        .attr("id", "gradient")

    gradient.append('stop').attr('offset', '0%')
        .style("stop-color", colors[0])
    gradient.append('stop').attr('offset', '100%')
        .style("stop-color", colors[1])

    legend.append('rect')
        .attr('width', 200).attr("height", 20)
        .style("fill", "url(#gradient)")

    const axis = legend.append('g').attr('id', 'axis').attr('transform', 'translate(0,20)')

    let gr = d3.scaleLinear().range([200, 0])
    let yAxis = d3.axisBottom().scale(gr).ticks(4)
    axis.call(yAxis)
        .append("text")
        .style("text-anchor", "end")

    // вызываем update() при изменении param
    d3.selectAll('input[name="param"]').on('change', function () {
        param = this.value
        update()
    })

    // создаем слайдер
    const slider = d3.sliderBottom()
        .domain([d3.min(years), d3.max(years)])
        .step(1).width(width).default(year)
        .ticks(0).displayValue(false)
        .on('onchange', val => { // вызываем update() при изменении year
            year = val
            update()
        })

    // создаем svg для добавления своих элементов
    const range = d3.select('#slider').append('svg')
        .attr('width', width).attr('height', sliderHeight)

    // накидываем overlay
    range.append('rect').attr('width', width).attr('height', height).attr('id', 'overlay')

    // создаем контейнер для барчарта
    const chart = range.append('g')

    // добавляем слайдер
    range.append('g').call(slider)

    // убираем лишние элементы и делаем кастюмный thumb
    d3.select('g.slider').selectAll('line').remove()
    d3.select('g.parameter-value path').attr('d', `M 0,0 V ${sliderHeight} H -${x.bandwidth()} V 0 Z`)

    // Part 1: тут можно создать проекцию d3.geoEquirectangular() и подстроить ее под размеры экрана, а также
    // создать генератор пути
    const scale = 10
    let projection = d3.geoEquirectangular().scale(width / scale).translate([width / 2, height / 2])
    let path = d3.geoPath().projection(projection)

    // Part 1: тут можно добавить карту мира на основе генератора пути
    const map = svg.selectAll("path")
        .data(world.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", d => path(d))

    // Part 1: добавить обработчики событий мыши для отображения имени страны в элементе #country
    d3.selectAll('.country')
        .on('mouseover', d => d3.select("#country").text(d.properties.name))
        .on('mouseout', () => d3.select("#country").text(''))

    // эта функция будет обновлять оба графика при изменении какого-либо из двух основных параметров
    function update() {
        // обновляем год
        d3.select('#year').text(year)

        // обновляем домен цветовой шкалы
        color.domain(d3.extent(data.map(d => +d[param][year])))

        // изменяем цвета стран
        map.attr('fill', feature => {
            // находим страну в наборе данных
            let country = data.find(d => d.geo === feature.id.toLowerCase())
            // Part 1: задать цвет страны в зависимости от выбранных параметров
            return country ? color(country[param][year]) : noColor
        })

        // берем набор значений нужного показателя для каждого из годов для барчарта
        let array = years.map(y => d3.sum(data.map(d => +d[param][y])))

        //  Part 2: обновить домен шкалы y
        y.domain(d3.extent(array))

        // Part 2: реализовать создание и добавление барчарта
        let barchart = chart.selectAll("rect").data(array)
        barchart.enter()
            .append("rect")
            .merge(barchart)
            .transition()
            .duration(duration)
            .attr("x", (d, index) => x(years[index]))
            .attr("y", d => y(d))
            .attr("width", x.bandwidth())
            .attr("height", () => 150)

        barchart.exit().remove()

        // Part 3: обновляем шкалу в легенде на основе выбранных параметров
        gr.domain(d3.extent(array).reverse())
        axis.call(yAxis)
    }

    // вызываем update() при инициации
    update()
})

async function loadData() {
    const population = await d3.csv('data/pop.csv')
    const rest = {
        'gdp': await d3.csv('data/gdppc.csv'),
        'child-mortality': await d3.csv('data/cmu5.csv'),
        'life-expectancy': await d3.csv('data/life_expect.csv'),
        'fertility-rate': await d3.csv('data/tfr.csv')
    }
    const data = population.map(d => {
        return {
            geo: d.geo,
            country: d.country,
            region: d.region,
            population: {...d},
            ...Object.values(rest).map(v => v.find(r => r.geo === d.geo)).reduce((o, d, i) => ({
                ...o,
                [Object.keys(rest)[i]]: d
            }), {})
        }
    })
    const world = await d3.json('http://enjalot.github.io/wwsd/data/world/world-110m.geojson')
    return {data, world}
}
