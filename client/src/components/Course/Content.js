import React, { useState } from 'react';
import PropTypes from 'prop-types';
import AnimateHeight from 'react-animate-height';
import Editable from '../layout/Editable';
import AddNew from '../layout/AddNew';

const Content = props => {
    const { editing } = props;
    const [toShow, show] = useState('topic0');
    const [names, changeNames] = useState({
        topic1: 'Topic Name 1',
        topic2: 'Topic Name 2',
        topic3: 'Topic Name 3'
    });

    const toggleShow = e => {
        const current = document.getElementById(toShow);
        if (current) {
            current.classList.remove('show');
            current.classList.add('hide');
        }

        const parent = e.target.closest('li');
        if (parent.id !== toShow) {
            parent.classList.add('show');
            parent.classList.remove('hide');
            show(parent.id);
        } else {
            show('topic-0');
        }
    };

    return (
        <section>
            <h2>Course Content</h2>
            <ul className='course-topics'>
                {editing && (
                    <li>
                        <AddNew>+ Add new topic</AddNew>
                    </li>
                )}
                <li className='hide' id='topic1'>
                    {editing ? (
                        <p>
                            <span className='delete-btn'>- </span>
                            <Editable
                                text={names.topic1}
                                onChange={e =>
                                    changeNames({
                                        ...names,
                                        topic1: e.target.value
                                    })
                                }
                                disabled={!editing}
                                tagName='span'
                            />
                        </p>
                    ) : (
                        <p onClick={toggleShow}>
                            <span className='show-button'>+</span>
                            <span className='hide-button'>-</span>
                            <span
                                dangerouslySetInnerHTML={{
                                    __html: names.topic1
                                }}
                            />
                        </p>
                    )}

                    <AnimateHeight
                        height={toShow === 'topic1' || editing ? 'auto' : 0}
                    >
                        <ul>
                            {editing && (
                                <li>
                                    <AddNew>+ Add new resource</AddNew>
                                </li>
                            )}
                            <li>
                                <p>
                                    {editing && (
                                        <button className='delete-btn'>
                                            -
                                        </button>
                                    )}
                                    Video 1
                                </p>
                            </li>
                            {editing && (
                                <li>
                                    <AddNew>+ Add new resource</AddNew>
                                </li>
                            )}
                            <li>
                                <p>
                                    {editing && (
                                        <button className='delete-btn'>
                                            -
                                        </button>
                                    )}
                                    Video 2
                                </p>
                            </li>
                            {editing && (
                                <li>
                                    <AddNew>+ Add new resource</AddNew>
                                </li>
                            )}
                            <li>
                                <p>
                                    {editing && (
                                        <button className='delete-btn'>
                                            -
                                        </button>
                                    )}
                                    Resource 1
                                </p>
                            </li>
                            {editing && (
                                <li>
                                    <AddNew>+ Add new resource</AddNew>
                                </li>
                            )}
                            <li>
                                <p>
                                    {editing && (
                                        <button className='delete-btn'>
                                            -
                                        </button>
                                    )}
                                    Test 1
                                </p>
                            </li>
                            {editing && (
                                <li>
                                    <AddNew>+ Add new resource</AddNew>
                                </li>
                            )}
                        </ul>
                    </AnimateHeight>
                    {editing && <AddNew>+ Add new topic</AddNew>}
                </li>
            </ul>
        </section>
    );
};

Content.propTypes = {
    editing: PropTypes.bool.isRequired
};

export default Content;