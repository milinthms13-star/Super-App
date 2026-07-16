import React from 'react';
import './KundaliChart.css';

const KundaliChart = ({ kundali }) => {
  const houses = Array.from({ length: 12 }, (_, i) => i + 1);

  // Map planets to their houses
  const getPlanetsInHouse = (houseNumber) => {
    const planets = [];
    
    Object.entries(kundali.planets).forEach(([planet, data]) => {
      if (data.house === houseNumber) {
        planets.push({
          name: planet,
          sign: data.sign,
          degree: data.degree,
        });
      }
    });

    return planets;
  };

  const getPlanetSymbol = (planet) => {
    const symbols = {
      sun: '☉',
      moon: '☽',
      mars: '♂',
      mercury: '☿',
      jupiter: '♃',
      venus: '♀',
      saturn: '♄',
      rahu: '☊',
      ketu: '☋',
    };
    return symbols[planet] || planet;
  };

  return (
    <div className="kundali-chart">
      <div className="chart-header">
        <h3>Birth Chart (Kundali)</h3>
        <div className="chart-legend">
          <span><strong>Ascendant:</strong> {kundali.ascendant}</span>
          <span><strong>Moon Sign:</strong> {kundali.moonSign}</span>
          <span><strong>Sun Sign:</strong> {kundali.sunSign}</span>
          <span><strong>Nakshatra:</strong> {kundali.nakshatra}</span>
        </div>
      </div>

      <div className="chart-container">
        {/* North Indian Style Chart */}
        <div className="chart-north-indian">
          {houses.map((house) => {
            const planets = getPlanetsInHouse(house);
            
            return (
              <div
                key={house}
                className={`house house-${house}`}
                data-house={house}
              >
                <div className="house-number">{house}</div>
                {house === 1 && <div className="ascendant-marker">ASC</div>}
                
                {planets.length > 0 && (
                  <div className="house-planets">
                    {planets.map((planet, idx) => (
                      <div key={idx} className="planet-marker">
                        <span className="planet-symbol">{getPlanetSymbol(planet.name)}</span>
                        <span className="planet-name">{planet.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="planetary-table">
        <h4>Planetary Positions</h4>
        <table>
          <thead>
            <tr>
              <th>Planet</th>
              <th>Sign</th>
              <th>House</th>
              <th>Degree</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(kundali.planets).map(([planet, data]) => (
              <tr key={planet}>
                <td>
                  <span className="planet-symbol">{getPlanetSymbol(planet)}</span>
                  {planet.charAt(0).toUpperCase() + planet.slice(1)}
                </td>
                <td>{data.sign}</td>
                <td>{data.house}</td>
                <td>{data.degree?.toFixed(2)}°</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KundaliChart;
