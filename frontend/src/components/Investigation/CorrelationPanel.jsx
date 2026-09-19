import "../../styles/correlation-panel.css";

export default function CorrelationPanel({ investigation }) {

    if (!investigation) {
        return null;
    }

    const correlations = investigation?.report?.correlations || investigation?.final_report?.correlations || investigation?.correlations || [];

    return (

        <div className="correlation-panel">

            <h2>Correlation Analysis</h2>

            {
                correlations.length === 0 ?

                (
                    <p>No correlations available.</p>
                )

                :

                (
                    correlations.map((item, index) => (

                        <div
                            key={index}
                            className="correlation-card"
                        >

                            <div className="correlation-header">

                                <h3>{item.service_name}</h3>

                                <span className={`severity ${item.severity?.toLowerCase()}`}>
                                    {item.severity}
                                </span>

                            </div>

                            <p>

                                <strong>Total Findings:</strong>

                                {" "}

                                {item.evidence_count}

                            </p>

                            <div className="correlation-section">

                                <strong>Finding Types</strong>

                                <ul>

                                    {
                                        item.evidence.map((evidence, i) => (

                                            <li key={i}>{evidence.type}</li>

                                        ))
                                    }

                                </ul>

                            </div>

                            <div className="correlation-section">

                                <strong>Possible Causes</strong>

                                <ul>

                                    {
                                        item.possible_causes.map((cause, i) => (

                                            <li key={i}>{cause}</li>

                                        ))
                                    }

                                </ul>

                            </div>

                        </div>

                    ))
                )
            }

        </div>

    );

}
